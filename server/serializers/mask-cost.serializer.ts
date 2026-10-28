/**
 * Zero-Cost Visibility Serializer
 * Mandat (§2.3 item 4): Kasir (KASIR) dan Barista (BARISTA) dilarang keras menerima
 * data biaya, HPP, True Cost, unit_cost, atau harga beli bahan baku dalam respon API apapun.
 */

const SENSITIVE_COST_KEYS = new Set([
  "unit_cost",
  "unitCost",
  "costPrice",
  "cost_price",
  "hpp",
  "hppFifo",
  "hpp_fifo",
  "hppAverage",
  "hpp_average",
  "directHpp",
  "direct_hpp",
  "trueHpp",
  "true_hpp",
  "trueCost",
  "true_cost",
  "bomCost",
  "bom_cost",
  "totalCost",
  "total_cost",
  "materialCost",
  "material_cost",
  "overheadCost",
  "overhead_cost",
  "allocatedOverhead",
  "cogs",
  "rawCost",
  "baseCost",
  "standardCost",
  "cost",
  "margin",
  "grossMargin",
  "poolAmount",
  "pool_amount",
  "idleCost",
  "idle_cost",
  "capacityRatio",
  "capacity_ratio",
]);

export function maskCostData<T>(data: T, role?: string | null): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  // Mask when role is KASIR or BARISTA (§2.3 item 4)
  const normalizedRole = (role || "").toUpperCase();
  if (normalizedRole !== "KASIR" && normalizedRole !== "BARISTA") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskCostData(item, role)) as unknown as T;
  }

  const maskedObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (SENSITIVE_COST_KEYS.has(key)) {
      // Omit sensitive cost field completely from cashier/barista response
      continue;
    }

    if (value && typeof value === "object") {
      maskedObj[key] = maskCostData(value, role);
    } else {
      maskedObj[key] = value;
    }
  }

  return maskedObj as T;
}
