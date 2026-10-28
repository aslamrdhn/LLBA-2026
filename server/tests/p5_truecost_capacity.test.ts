process.env.NODE_ENV = "test";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import {
  calculateCapacityAbsorption,
  calculateDynamicProvisionalPool,
  compileTrueCost,
  CostPoolInput,
  ProductVolumeInput,
} from "../domain/truecost/capacity-absorption.ts";

describe("Fase 5: Deterministic True Cost & Closed Capacity Absorption Engine (§7, §8.13)", () => {
  it("1. Fixture A5: Cocok persis dengan hitungan resmi Average & FIFO (§7.6)", () => {
    // 4 Pools with total Rp21.000.000 for normal capacity 3.000 cups
    const pools: CostPoolInput[] = [
      { id: "p1", name: "Labor", category: "LABOR", expectedMonthlyAmount: 12000000, normalCapacityUnits: 3000 },
      { id: "p2", name: "Utilities", category: "UTILITIES", expectedMonthlyAmount: 1500000, normalCapacityUnits: 3000 },
      { id: "p3", name: "Rent", category: "RENT", expectedMonthlyAmount: 6000000, normalCapacityUnits: 3000 },
      { id: "p4", name: "Other", category: "OTHER", expectedMonthlyAmount: 1500000, normalCapacityUnits: 3000 },
    ];

    // Single menu product: 3.000 units sold (full capacity)
    // Testing Average HPP (9.000)
    const avgProducts: ProductVolumeInput[] = [
      {
        menuId: "menu-kopi-susu",
        name: "Kopi Susu Gula Aren",
        unitsSold: 3000,
        hppPerUnit: 9000,
        sellingPrice: 28000,
      },
    ];

    const avgResult = compileTrueCost(pools, avgProducts);
    const avgItem = avgResult.products[0];

    // Total overhead = 12jt + 1.5jt + 6jt + 1.5jt = 21jt / 3.000 = 7.000
    assert.equal(avgItem.allocatedOverheadPerUnit.toNumber(), 7000);
    // True Cost = HPP (9.000) + Overhead (7.000) = 16.000
    assert.equal(avgItem.trueCostPerUnit.toNumber(), 16000);
    // True Margin = 28.000 - 16.000 = 12.000 (42.86%)
    assert.equal(avgItem.trueMarginAmount.toNumber(), 12000);
    assert.equal(avgItem.trueMarginPercent.toNumber(), 42.86);

    // Testing FIFO HPP (8.100)
    const fifoProducts: ProductVolumeInput[] = [
      {
        menuId: "menu-kopi-susu",
        name: "Kopi Susu Gula Aren",
        unitsSold: 3000,
        hppPerUnit: 8100,
        sellingPrice: 28000,
      },
    ];

    const fifoResult = compileTrueCost(pools, fifoProducts);
    const fifoItem = fifoResult.products[0];

    // True Cost FIFO = 8.100 + 7.000 = 15.100
    assert.equal(fifoItem.trueCostPerUnit.toNumber(), 15100);
    // True Margin FIFO = 28.000 - 15.100 = 12.900 (46.07%)
    assert.equal(fifoItem.trueMarginAmount.toNumber(), 12900);
    assert.equal(fifoItem.trueMarginPercent.toNumber(), 46.07);
  });

  it("2. A6b Capacity-Based: 4 Skenario Wajib (Low, Full, Over, Empty) (§7.2)", () => {
    const pool: CostPoolInput = {
      id: "pool-sewa",
      name: "Sewa Tempat",
      category: "RENT",
      expectedMonthlyAmount: 10000000, // Rp10.000.000
      normalCapacityUnits: 3000,
    };

    // Skenario A: Low sales (10 / 3.000 units)
    const lowRes = calculateCapacityAbsorption(pool, [
      { menuId: "m1", name: "Item", unitsSold: 10, hppPerUnit: 5000, sellingPrice: 20000 },
    ]);
    assert.equal(lowRes.allocatedAmount.toNumber(), 33333);
    assert.equal(lowRes.idleCostAmount.toNumber(), 9966667);
    assert.equal(lowRes.allocatedAmount.plus(lowRes.idleCostAmount).toNumber(), 10000000);

    // Skenario B: Full capacity (3.000 / 3.000 units)
    const fullRes = calculateCapacityAbsorption(pool, [
      { menuId: "m1", name: "Item", unitsSold: 3000, hppPerUnit: 5000, sellingPrice: 20000 },
    ]);
    assert.equal(fullRes.allocatedAmount.toNumber(), 10000000);
    assert.equal(fullRes.idleCostAmount.toNumber(), 0);

    // Skenario C: Over capacity (3.500 / 3.000 units) -> Clamped at max 1.0 (Rp10.000.000)
    const overRes = calculateCapacityAbsorption(pool, [
      { menuId: "m1", name: "Item", unitsSold: 3500, hppPerUnit: 5000, sellingPrice: 20000 },
    ]);
    assert.equal(overRes.allocatedAmount.toNumber(), 10000000);
    assert.equal(overRes.idleCostAmount.toNumber(), 0);

    // Skenario D: Empty month (0 / 3.000 units)
    const emptyRes = calculateCapacityAbsorption(pool, [
      { menuId: "m1", name: "Item", unitsSold: 0, hppPerUnit: 5000, sellingPrice: 20000 },
    ]);
    assert.equal(emptyRes.allocatedAmount.toNumber(), 0);
    assert.equal(emptyRes.idleCostAmount.toNumber(), 10000000);
  });

  it("3. Largest Remainder Method: Rp1.000.000 ke 3 produk berbobot sama -> 333.334, 333.333, 333.333 (§7.7)", () => {
    const pool: CostPoolInput = {
      id: "pool-test",
      name: "Listrik",
      category: "UTILITIES",
      expectedMonthlyAmount: 1000000, // Rp1.000.000
      normalCapacityUnits: 300,
    };

    // 3 products with identical volume 100 each -> total 300 (full capacity)
    const products: ProductVolumeInput[] = [
      { menuId: "m1", name: "Americano", unitsSold: 100, hppPerUnit: 4000, sellingPrice: 18000 },
      { menuId: "m2", name: "Latte", unitsSold: 100, hppPerUnit: 6000, sellingPrice: 24000 },
      { menuId: "m3", name: "Cappuccino", unitsSold: 100, hppPerUnit: 6000, sellingPrice: 24000 },
    ];

    const result = calculateCapacityAbsorption(pool, products);

    // Sorted by menuId ascending: m1 gets the +1 remainder
    assert.equal(result.productAllocations.get("m1")?.toNumber(), 333334);
    assert.equal(result.productAllocations.get("m2")?.toNumber(), 333333);
    assert.equal(result.productAllocations.get("m3")?.toNumber(), 333333);

    // Invariant: sum equals exactly 1.000.000
    const sum = (result.productAllocations.get("m1") || new Decimal(0))
      .plus(result.productAllocations.get("m2") || new Decimal(0))
      .plus(result.productAllocations.get("m3") || new Decimal(0));
    assert.equal(sum.toNumber(), 1000000);
  });

  it("4. Dynamic Provisional Cost Robust: Mengabaikan lonjakan bonus 10x dan menolak <80% baseline (§7.4, §7.7)", () => {
    // 4a. 10 hari berjalan: Hari 1 ada lonjakan bonus 500.000, Hari 2-10 normal 50.000
    // Tanpa trimmed mean, proyeksi sisa bulan akan membengkak drastis.
    const dailyActuals = [500000, ...Array(9).fill(50000)];
    const actualSum = dailyActuals.reduce((a, b) => a + b, 0); // 950.000

    const res = calculateDynamicProvisionalPool({
      actualExpensesToDate: actualSum,
      dailyActuals,
      daysElapsed: 10,
      totalDaysInMonth: 30,
      expectedMonthlyBaseline: 2000000, // 2jt baseline
    });

    // 10% trimmed mean membuang 1 terendah dan 1 tertinggi (lonjakan 500rb dibuang)
    assert.equal(res.trimmedDailyAvg.toNumber(), 50000);
    // Sisa 20 hari diproyeksikan dengan rata-rata bersih 50rb/hari -> 1.000.000 + 950.000 = 1.950.000
    assert.equal(res.projectedFull.toNumber(), 1950000);
    assert.equal(res.provisionalPool.toNumber(), 1950000);

    // 4b. Uji batas bawah (baseline clamp): Pengeluaran sangat kecil tidak boleh jatuh di bawah 80% baseline
    const lowActuals = Array(10).fill(10000); // 10rb per hari
    const lowSum = lowActuals.reduce((a, b) => a + b, 0); // 100.000

    const resLow = calculateDynamicProvisionalPool({
      actualExpensesToDate: lowSum,
      dailyActuals: lowActuals,
      daysElapsed: 10,
      totalDaysInMonth: 30,
      expectedMonthlyBaseline: 2000000, // 2jt baseline
    });

    // Proyeksi penuh hanya 300.000, tapi clamp 80% menjaga di minimal 1.600.000
    assert.equal(resLow.projectedFull.toNumber(), 300000);
    assert.equal(resLow.provisionalPool.toNumber(), 1600000);
  });
});
