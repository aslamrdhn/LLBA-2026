import Decimal from "decimal.js";

export interface CostPoolInput {
  id: string;
  name: string;
  category: "RENT" | "UTILITIES" | "LABOR" | "DEPRECIATION" | "OTHER";
  expectedMonthlyAmount: Decimal | number;
  normalCapacityUnits: Decimal | number; // e.g. 3000 cups
  actualExpensesToDate?: Decimal | number;
}

export interface ProductVolumeInput {
  menuId: string;
  name: string;
  unitsSold: Decimal | number;
  allocationWeight?: Decimal | number; // default 1
  hppPerUnit: Decimal | number; // Material + Packaging + Modifier
  sellingPrice: Decimal | number;
}

export interface AllocatedProductOutput {
  menuId: string;
  name: string;
  unitsSold: Decimal;
  hppPerUnit: Decimal;
  allocatedOverheadTotal: Decimal;
  allocatedOverheadPerUnit: Decimal;
  trueCostPerUnit: Decimal;
  sellingPrice: Decimal;
  trueMarginAmount: Decimal;
  trueMarginPercent: Decimal; // e.g. 42.86
}

export interface CapacityAllocationResult {
  poolId: string;
  poolName: string;
  totalPoolAmount: Decimal;
  normalCapacityUnits: Decimal;
  realizedUnits: Decimal;
  capacityRatio: Decimal; // 0 to 1
  allocatedAmount: Decimal;
  idleCostAmount: Decimal;
  productAllocations: Map<string, Decimal>; // menuId -> allocated rupiah
}

export interface TrueCostSummaryResult {
  periodDaysElapsed: number;
  totalDaysInMonth: number;
  totalPoolExpenses: Decimal;
  totalAllocatedOverhead: Decimal;
  totalIdleCost: Decimal;
  products: AllocatedProductOutput[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isSpikeDetected: boolean;
}

/**
 * Closed Capacity Absorption Engine using Largest Remainder Method (§7.1, §7.2, §8.13)
 * Guarantees: sum(ProductAllocations) + IdleCost === PoolAmount (exact integer rupiah)
 */
export function calculateCapacityAbsorption(
  pool: CostPoolInput,
  products: ProductVolumeInput[],
): CapacityAllocationResult {
  const poolAmount = new Decimal(pool.expectedMonthlyAmount).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const normalCapacity = new Decimal(pool.normalCapacityUnits);

  // 1. Calculate total weighted units sold
  let totalWeightedUnits = new Decimal(0);
  const productWeights = new Map<string, Decimal>();

  for (const p of products) {
    const units = new Decimal(p.unitsSold);
    const weight = new Decimal(p.allocationWeight ?? 1);
    const weightedUnits = units.times(weight);
    productWeights.set(p.menuId, weightedUnits);
    totalWeightedUnits = totalWeightedUnits.plus(weightedUnits);
  }

  // 2. Capacity ratio: min(1, realized / normal) (§7.1)
  let capacityRatio = new Decimal(0);
  if (totalWeightedUnits.gt(0) && normalCapacity.gt(0)) {
    capacityRatio = Decimal.min(new Decimal(1), totalWeightedUnits.dividedBy(normalCapacity));
  }

  // 3. Allocated Pool vs Idle Cost
  // Allocated = Pool * capacityRatio (half-up)
  // Idle Cost = Pool - Allocated
  const allocatedAmount = poolAmount.times(capacityRatio).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const idleCostAmount = poolAmount.minus(allocatedAmount);

  // 4. Distribute allocatedAmount across products using Largest Remainder Method
  const productAllocations = new Map<string, Decimal>();

  if (totalWeightedUnits.isZero() || allocatedAmount.isZero()) {
    // If no sales, all products get 0 allocation, entire pool is idle cost
    for (const p of products) {
      productAllocations.set(p.menuId, new Decimal(0));
    }
  } else {
    interface RemainderSlot {
      menuId: string;
      floorValue: Decimal;
      remainder: Decimal;
    }

    const slots: RemainderSlot[] = [];
    let allocatedSum = new Decimal(0);

    for (const p of products) {
      const pWeight = productWeights.get(p.menuId) || new Decimal(0);
      const exactShare = allocatedAmount.times(pWeight).dividedBy(totalWeightedUnits);
      const floorValue = exactShare.floor();
      const remainder = exactShare.minus(floorValue);

      slots.push({
        menuId: p.menuId,
        floorValue,
        remainder,
      });

      allocatedSum = allocatedSum.plus(floorValue);
    }

    // Distribute remaining rupiah to highest remainder slots
    let remainingToDistribute = allocatedAmount.minus(allocatedSum).toNumber();

    // Sort by remainder descending, tie-break by menuId ascending
    slots.sort((a, b) => {
      const diff = b.remainder.comparedTo(a.remainder);
      if (diff !== 0) return diff;
      return a.menuId.localeCompare(b.menuId);
    });

    for (const slot of slots) {
      let finalAlloc = slot.floorValue;
      if (remainingToDistribute > 0) {
        finalAlloc = finalAlloc.plus(1);
        remainingToDistribute -= 1;
      }
      productAllocations.set(slot.menuId, finalAlloc);
    }
  }

  // 5. Invariant check: sum(productAllocations) + idleCostAmount === poolAmount
  let testSum = new Decimal(0);
  for (const val of productAllocations.values()) {
    testSum = testSum.plus(val);
  }
  const totalVerified = testSum.plus(idleCostAmount);

  if (!totalVerified.equals(poolAmount)) {
    throw new Error(
      `Capacity Absorption Invariant Violated: sum(${testSum}) + idle(${idleCostAmount}) = ${totalVerified} !== pool(${poolAmount})`,
    );
  }

  return {
    poolId: pool.id,
    poolName: pool.name,
    totalPoolAmount: poolAmount,
    normalCapacityUnits: normalCapacity,
    realizedUnits: totalWeightedUnits,
    capacityRatio,
    allocatedAmount,
    idleCostAmount,
    productAllocations,
  };
}

/**
 * Dynamic Robust Provisional Cost calculation with 10% Trimmed Mean (§7.4)
 */
export function calculateDynamicProvisionalPool(params: {
  actualExpensesToDate: Decimal | number;
  dailyActuals: number[];
  daysElapsed: number;
  totalDaysInMonth: number;
  expectedMonthlyBaseline: Decimal | number;
}): {
  provisionalPool: Decimal;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isSpike: boolean;
  trimmedDailyAvg: Decimal;
  projectedFull: Decimal;
} {
  const { actualExpensesToDate, dailyActuals, daysElapsed, totalDaysInMonth, expectedMonthlyBaseline } = params;

  const actualToDate = new Decimal(actualExpensesToDate);
  const baselineFull = new Decimal(expectedMonthlyBaseline);
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

  let trimmedDailyAvg = new Decimal(0);

  if (daysElapsed < 5 || dailyActuals.length < 5) {
    // Simple mean if < 5 days
    if (daysElapsed > 0) {
      trimmedDailyAvg = actualToDate.dividedBy(daysElapsed);
    }
  } else {
    // 10% Trimmed Mean
    const sorted = [...dailyActuals].sort((a, b) => a - b);
    const trimCount = Math.max(1, Math.floor(sorted.length * 0.1));
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

    const sumTrimmed = trimmed.reduce((acc, curr) => acc + curr, 0);
    trimmedDailyAvg = new Decimal(sumTrimmed).dividedBy(trimmed.length || 1);
  }

  const projectedRemaining = trimmedDailyAvg.times(daysRemaining);
  const projectedFull = actualToDate.plus(projectedRemaining);

  // Baseline clamp: provisionalFull = max(projectedFull, baselineFull * 0.8)
  const floorBaseline = baselineFull.times(0.8);
  const provisionalPool = Decimal.max(projectedFull, floorBaseline).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  // Confidence determination
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  const isSpike = baselineFull.gt(0) && projectedFull.gt(baselineFull.times(1.5));

  if (baselineFull.gt(0)) {
    const deviation = projectedFull.minus(baselineFull).abs().dividedBy(baselineFull);
    if (deviation.lt(0.1)) {
      confidence = "HIGH";
    } else if (projectedFull.gte(baselineFull.times(0.8)) && projectedFull.lte(baselineFull.times(1.5))) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }
  }

  return {
    provisionalPool,
    confidence,
    isSpike,
    trimmedDailyAvg,
    projectedFull,
  };
}

/**
 * Compile True Cost Summary for all products across all cost pools (§7.1, Fixture A5)
 */
export function compileTrueCost(
  pools: CostPoolInput[],
  products: ProductVolumeInput[],
): TrueCostSummaryResult {
  let totalPoolExpenses = new Decimal(0);
  let totalAllocatedOverhead = new Decimal(0);
  let totalIdleCost = new Decimal(0);

  const productOverheadMap = new Map<string, Decimal>();
  for (const p of products) {
    productOverheadMap.set(p.menuId, new Decimal(0));
  }

  for (const pool of pools) {
    const result = calculateCapacityAbsorption(pool, products);
    totalPoolExpenses = totalPoolExpenses.plus(result.totalPoolAmount);
    totalAllocatedOverhead = totalAllocatedOverhead.plus(result.allocatedAmount);
    totalIdleCost = totalIdleCost.plus(result.idleCostAmount);

    for (const [menuId, alloc] of result.productAllocations.entries()) {
      const prev = productOverheadMap.get(menuId) || new Decimal(0);
      productOverheadMap.set(menuId, prev.plus(alloc));
    }
  }

  const productOutputs: AllocatedProductOutput[] = products.map((p) => {
    const units = new Decimal(p.unitsSold);
    const hpp = new Decimal(p.hppPerUnit);
    const price = new Decimal(p.sellingPrice);
    const overheadTotal = productOverheadMap.get(p.menuId) || new Decimal(0);

    const overheadPerUnit = units.gt(0)
      ? overheadTotal.dividedBy(units).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      : new Decimal(0);

    const trueCostPerUnit = hpp.plus(overheadPerUnit);
    const marginAmount = price.minus(trueCostPerUnit);
    const marginPercent = price.gt(0)
      ? marginAmount.dividedBy(price).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : new Decimal(0);

    return {
      menuId: p.menuId,
      name: p.name,
      unitsSold: units,
      hppPerUnit: hpp,
      allocatedOverheadTotal: overheadTotal,
      allocatedOverheadPerUnit: overheadPerUnit,
      trueCostPerUnit,
      sellingPrice: price,
      trueMarginAmount: marginAmount,
      trueMarginPercent: marginPercent,
    };
  });

  return {
    periodDaysElapsed: 30,
    totalDaysInMonth: 30,
    totalPoolExpenses,
    totalAllocatedOverhead,
    totalIdleCost,
    products: productOutputs,
    confidence: "HIGH",
    isSpikeDetected: false,
  };
}
