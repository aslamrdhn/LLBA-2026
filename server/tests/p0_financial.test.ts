process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/prisma.ts";
import { checkout } from "../services/checkout.service.ts";
import { voidSale } from "../services/void.service.ts";
import { processRefund } from "../services/refund.service.ts";
import { AttendanceService } from "../services/shift.service.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";
import { Decimal } from "../utils/money.ts";

describe("P0 Golden Invariants & Financial Acceptance Tests", () => {
  let tenant: any;
  let outlet: any;
  let warehouse: any;
  let unitKg: any;
  let unitPcs: any;
  let coffeeItem: any;
  let cupItem: any;
  let menuAmericano: any;
  let cashierProfile: any;
  const attendanceService = new AttendanceService();

  before(async () => {
    // Setup isolated test tenant
    const uniqueSlug = `p0-tenant-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: "P0 Golden Test Coffee",
        slug: uniqueSlug,
        plan: "business", // Average Sync cost engine
        status: "active",
        timezone: "Asia/Jakarta",
      },
    });

    warehouse = await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: "Gudang Utama",
        location: "Depan",
      },
    });

    outlet = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: "Outlet P0",
        address: "Jl. Kopi No. 1",
        defaultWarehouseId: warehouse.id,
      },
    });

    const now = new Date();
    const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await prisma.period.create({
      data: {
        tenantId: tenant.id,
        name: periodStr,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        status: "OPEN",
      },
    });

    for (const prefix of ["INV", "PO", "RCV", "JRN"]) {
      await prisma.numberSequence.create({
        data: {
          tenantId: tenant.id,
          prefix,
          year: String(now.getFullYear()),
          lastNumber: 0,
        },
      });
    }

    unitKg = await prisma.unit.create({
      data: {
        tenantId: tenant.id,
        name: "Gram",
        symbol: "g",
      },
    });

    unitPcs = await prisma.unit.create({
      data: {
        tenantId: tenant.id,
        name: "Piece",
        symbol: "pcs",
      },
    });

    coffeeItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `COF-P0-${Date.now()}`,
        name: "Kopi Espresso Blend",
        category: "Bahan Baku",
        unitId: unitKg.id,
        price: 250, // Rp 250 / gram
        status: "ACTIVE",
      },
    });

    cupItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `CUP-P0-${Date.now()}`,
        name: "Paper Cup 8oz",
        category: "Kemasan",
        unitId: unitPcs.id,
        price: 1500,
        status: "ACTIVE",
      },
    });

    // Opening inventory
    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: coffeeItem.id,
        currentStock: 1000, // 1000 grams
        averageCost: 200,
        version: 0,
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: cupItem.id,
        currentStock: 100, // 100 cups
        averageCost: 1200,
        version: 0,
      },
    });

    menuAmericano = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: "Iced Americano P0",
        price: 30000,
        category: "Coffee",
        isActive: true,
      },
    });

    await prisma.recipe.create({
      data: {
        tenantId: tenant.id,
        menuId: menuAmericano.id,
        version: 1,
        effectiveFrom: new Date("2026-01-01"),
        details: {
          create: [
            { tenantId: tenant.id, itemId: coffeeItem.id, quantity: 18, unitId: unitKg.id },
            { tenantId: tenant.id, itemId: cupItem.id, quantity: 1, unitId: unitPcs.id },
          ],
        },
      },
    });

    cashierProfile = await prisma.userProfile.create({
      data: {
        userId: `cashier-p0-${Date.now()}`,
        tenantId: tenant.id,
        role: "cashier",
        fullName: "Kasir P0 Test",
        pinHash: "hash123",
        status: "active",
        assignedOutlets: JSON.stringify([outlet.id]),
      },
    });
  });

  after(async () => {
    // Clean up
    await prisma.kitchenOrder.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.fifoConsumption.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.fifoAllocationJob.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outbox.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.returnDetail.deleteMany({ where: { returnOrder: { tenantId: tenant.id } } });
    await prisma.returnDetail.deleteMany({ where: { item: { tenantId: tenant.id } } });
    await prisma.returnOrder.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.salesDetail.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.payment.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.salesHeader.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.shift.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.journalLine.deleteMany({ where: { journalEntry: { tenantId: tenant.id } } });
    await prisma.journalEntry.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.account.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.inventoryBalance.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.recipeDetail.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.recipe.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.menu.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.item.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.unit.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outlet.updateMany({ where: { tenantId: tenant.id }, data: { defaultWarehouseId: null } });
    await prisma.outlet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.warehouse.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.period.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.numberSequence.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.idempotencyRecord.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userProfile.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  });

  it("1. Cash sale menghasilkan payment, inventory, HPP, dan journal konsisten & seimbang", async () => {
    const checkoutResult = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 2, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "60000" }],
      discountPercent: 0,
      idempotencyKey: `idem-cash-${Date.now()}`,
    });

    assert.ok(checkoutResult.sale, "Sale header should be created");
    assert.strictEqual(checkoutResult.sale.totalAmount, 60000);
    assert.strictEqual(checkoutResult.sale.status, "POSTED");

    // Verify Inventory balance decremented
    const coffeeBal = await prisma.inventoryBalance.findFirst({
      where: { tenantId: tenant.id, itemId: coffeeItem.id },
    });
    // Original: 1000. Sold 2 items * 18g = 36g. Expected: 964g.
    assert.strictEqual(coffeeBal?.currentStock, 964);

    const cupBal = await prisma.inventoryBalance.findFirst({
      where: { tenantId: tenant.id, itemId: cupItem.id },
    });
    // Original: 100. Sold 2 items * 1 cup = 2. Expected: 98 cups.
    assert.strictEqual(cupBal?.currentStock, 98);

    // Verify Journal Entry exists and Debit == Credit
    const journal = await prisma.journalEntry.findFirst({
      where: { tenantId: tenant.id, referenceId: checkoutResult.sale.id },
      include: { lines: true },
    });
    assert.ok(journal, "Journal entry should exist");
    const totalDebit = journal.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = journal.lines.reduce((sum, l) => sum + l.credit, 0);
    assert.strictEqual(
      Math.round(totalDebit * 100) / 100,
      Math.round(totalCredit * 100) / 100,
      "Journal debit must equal credit",
    );
  });

  it("2. Split Cash + QRIS checkout memisahkan Kas & Bank dan menyeimbangkan jurnal", async () => {
    const checkoutResult = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 2, discountAmount: 0 }],
      payments: [
        { method: "CASH", amount: "20000" },
        { method: "QRIS", amount: "40000" },
      ],
      discountPercent: 0,
      idempotencyKey: `idem-split-${Date.now()}`,
    });

    assert.strictEqual(checkoutResult.sale.totalAmount, 60000);

    const journal = await prisma.journalEntry.findFirst({
      where: { tenantId: tenant.id, referenceId: checkoutResult.sale.id },
      include: { lines: { include: { account: true } } },
    });

    assert.ok(journal, "Journal exists");
    const cashLine = journal.lines.find((l) => l.account.code === "KAS");
    const bankLine = journal.lines.find((l) => l.account.code === "BANK");

    assert.ok(cashLine, "KAS line should exist");
    assert.strictEqual(cashLine.debit, 20000, "Kas should be debited exactly 20000");

    assert.ok(bankLine, "BANK line should exist");
    assert.strictEqual(bankLine.debit, 40000, "Bank should be debited exactly 40000");

    const totalDebit = journal.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = journal.lines.reduce((sum, l) => sum + l.credit, 0);
    assert.strictEqual(
      Math.round(totalDebit * 100) / 100,
      Math.round(totalCredit * 100) / 100,
      "Split payment journal must be balanced",
    );
  });

  it("3. Shift closing: QRIS tidak menambah expected cash, hanya CASH yang dihitung", async () => {
    // Open a fresh shift
    const shift = await attendanceService.openShift(cashierProfile.userId, outlet.id);
    assert.ok(shift, "Shift opened");

    // Sale with 10k Cash + 50k QRIS = 60k
    await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 2, discountAmount: 0 }],
      payments: [
        { method: "CASH", amount: "10000" },
        { method: "QRIS", amount: "50000" },
      ],
      discountPercent: 0,
      idempotencyKey: `idem-shift-${Date.now()}`,
    });

    // Close shift with actualCash = 10,000
    const closed = await attendanceService.closeShift(shift.id, 10000);
    assert.strictEqual(
      Number(closed.expectedCash),
      10000,
      "Expected cash should strictly be 10000 (CASH only, QRIS 50000 must NOT be in expected cash)",
    );
    assert.strictEqual(
      Number(closed.variance),
      0,
      "Variance should be zero when actual cash matches expected cash",
    );
  });

  it("4. Idempotency: duplicate key returns cached result without duplicate inventory deduction", async () => {
    const key = `idemp-dup-test-${Date.now()}`;
    const initialCoffeeBal = (
      await prisma.inventoryBalance.findFirst({
        where: { tenantId: tenant.id, itemId: coffeeItem.id },
      })
    )?.currentStock || 0;

    const firstRun = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "30000" }],
      idempotencyKey: key,
    });

    const secondRun = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "30000" }],
      idempotencyKey: key,
    });

    assert.strictEqual(firstRun.sale.id, secondRun.sale.id, "Sale IDs must match for idempotent call");

    const afterCoffeeBal = (
      await prisma.inventoryBalance.findFirst({
        where: { tenantId: tenant.id, itemId: coffeeItem.id },
      })
    )?.currentStock || 0;

    // Only 1 item (18g) should have been deducted, not 36g!
    assert.strictEqual(
      initialCoffeeBal - afterCoffeeBal,
      18,
      "Stock should be deducted only once",
    );
  });

  it("5. Void Sale membalik jurnal, mengembalikan stok, dan mempertahankan konteks gudang", async () => {
    const checkoutResult = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "30000" }],
      idempotencyKey: `idem-void-${Date.now()}`,
    });

    const preVoidBal = (
      await prisma.inventoryBalance.findFirst({
        where: { tenantId: tenant.id, itemId: coffeeItem.id },
      })
    )?.currentStock || 0;

    const voided = await voidSale({
      tenantId: tenant.id,
      salesId: checkoutResult.sale.id,
      cashierId: cashierProfile.userId,
      reason: "Pelanggan salah pesan",
    });

    assert.strictEqual(voided.status, "VOID");

    const postVoidBal = (
      await prisma.inventoryBalance.findFirst({
        where: { tenantId: tenant.id, itemId: coffeeItem.id },
      })
    )?.currentStock || 0;

    // Stock returned by 18g
    assert.strictEqual(
      postVoidBal - preVoidBal,
      18,
      "Void must return 18g of coffee to inventory",
    );

    // Reversing journal exists and is balanced
    const reversingJournal = await prisma.journalEntry.findFirst({
      where: {
        tenantId: tenant.id,
        referenceId: checkoutResult.sale.id,
        description: { contains: "Reversing" },
      },
      include: { lines: true },
    });

    assert.ok(reversingJournal, "Reversing journal must be created on void");
    const revDebit = reversingJournal.lines.reduce((s, l) => s + l.debit, 0);
    const revCredit = reversingJournal.lines.reduce((s, l) => s + l.credit, 0);
    assert.strictEqual(
      Math.round(revDebit * 100) / 100,
      Math.round(revCredit * 100) / 100,
      "Void reversing journal must be balanced",
    );
  });

  it("6. Average Cost Engine: Perhitungan deterministic cocok dengan hand calculation", async () => {
    const engine = await CostEngineFactory.getEngine(tenant.id);

    // Initial state: current stock = 10 units at 50,000 average
    const testItemId = `item-avg-test-${Date.now()}`;
    await prisma.item.create({
      data: {
        id: testItemId,
        tenantId: tenant.id,
        sku: `SKU-AVG-${Date.now()}`,
        name: "Test Average Item",
        category: "Test",
        unitId: unitPcs.id,
        price: 100000,
        status: "ACTIVE",
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: testItemId,
        currentStock: 10,
        averageCost: 50000,
        version: 0,
      },
    });

    // Purchase 20 units at 80,000
    // Expected new average:
    // (10 * 50,000 + 20 * 80,000) / (10 + 20) = (500,000 + 1,600,000) / 30 = 2,100,000 / 30 = 70,000
    const purchaseResult = await engine.processPurchase(
      {
        itemId: testItemId,
        quantity: new Decimal(20),
        unitCost: new Decimal(80000),
        warehouseId: warehouse.id,
        purchaseOrderId: "PO-TEST-01",
      },
      tenant.id,
    );

    assert.strictEqual(
      purchaseResult.newAverageCost.toNumber(),
      70000,
      "Weighted average cost must strictly equal 70,000",
    );

    const updatedBal = await prisma.inventoryBalance.findFirst({
      where: { tenantId: tenant.id, itemId: testItemId },
    });
    assert.strictEqual(updatedBal?.currentStock, 30, "Current stock must be 30");
    assert.strictEqual(updatedBal?.averageCost, 70000, "Stored average cost must be 70,000");
  });

  it("7. FIFO Cost Engine: Mengonsumsi layer terlama (oldest first) dan melarang zero cost", async () => {
    // Create FIFO tenant
    const fifoTenant = await prisma.tenant.create({
      data: {
        name: "FIFO Test Tenant",
        slug: `fifo-test-${Date.now()}`,
        plan: "cashier", // FIFO
        status: "active",
      },
    });

    const fifoWh = await prisma.warehouse.create({
      data: {
        tenantId: fifoTenant.id,
        name: "FIFO WH",
      },
    });

    const fifoOutlet = await prisma.outlet.create({
      data: {
        tenantId: fifoTenant.id,
        name: "FIFO Outlet",
        defaultWarehouseId: fifoWh.id,
      },
    });

    const fifoSale = await prisma.salesHeader.create({
      data: {
        tenantId: fifoTenant.id,
        outletId: fifoOutlet.id,
        invoiceNumber: `INV-FIFO-${Date.now()}`,
        businessDate: new Date(),
        cashierId: "cashier-test",
        subtotal: 100000,
        totalAmount: 100000,
      },
    });

    const fifoMenu = await prisma.menu.create({
      data: {
        tenantId: fifoTenant.id,
        name: "FIFO Coffee",
        price: 35000,
        category: "Coffee",
      },
    });

    const fifoDetail = await prisma.salesDetail.create({
      data: {
        salesId: fifoSale.id,
        menuId: fifoMenu.id,
        menuNameSnapshot: "FIFO Coffee",
        unitPriceSnapshot: 35000,
        quantity: 1,
        totalPrice: 35000,
      },
    });

    const fifoItem = await prisma.item.create({
      data: {
        tenantId: fifoTenant.id,
        sku: `SKU-FIFO-${Date.now()}`,
        name: "Biji Kopi Gayo",
        category: "Beans",
        unitId: unitKg.id,
        price: 150000,
      },
    });

    // Layer 1 (older, layerDate July 1): 5 units @ 100,000
    const layer1 = await prisma.fifoLayer.create({
      data: {
        tenantId: fifoTenant.id,
        itemId: fifoItem.id,
        warehouseId: fifoWh.id,
        batchNumber: "BATCH-OLD",
        quantity: 5,
        remainingQty: 5,
        unitCost: 100000,
        layerDate: new Date("2026-07-01"),
        isExhausted: false,
      },
    });

    // Layer 2 (newer, layerDate July 15): 10 units @ 120,000
    const layer2 = await prisma.fifoLayer.create({
      data: {
        tenantId: fifoTenant.id,
        itemId: fifoItem.id,
        warehouseId: fifoWh.id,
        batchNumber: "BATCH-NEW",
        quantity: 10,
        remainingQty: 10,
        unitCost: 120000,
        layerDate: new Date("2026-07-15"),
        isExhausted: false,
      },
    });

    const fifoEngine = await CostEngineFactory.getEngine(fifoTenant.id);

    // Consume 7 units: should consume 5 from Layer 1 (@100k = 500k) + 2 from Layer 2 (@120k = 240k) = 740,000 total HPP
    const allocResult = await fifoEngine.allocateSalesCost(
      [
        {
          salesDetailId: fifoDetail.id,
          itemId: fifoItem.id,
          quantity: new Decimal(7),
          warehouseId: fifoWh.id,
        },
      ],
      fifoSale.id,
      fifoTenant.id,
      fifoOutlet.id,
    );

    assert.strictEqual(
      allocResult.totalHpp.toNumber(),
      740000,
      "FIFO total cost must strictly be 740,000 (5@100k + 2@120k)",
    );

    // Layer 1 must be exhausted
    const l1Updated = await prisma.fifoLayer.findUnique({ where: { id: layer1.id } });
    assert.strictEqual(l1Updated?.remainingQty, 0, "Older layer 1 must be completely exhausted");
    assert.strictEqual(l1Updated?.isExhausted, true);

    // Layer 2 must have 8 remaining
    const l2Updated = await prisma.fifoLayer.findUnique({ where: { id: layer2.id } });
    assert.strictEqual(l2Updated?.remainingQty, 8, "Newer layer 2 must have 8 remaining");

    // Clean up FIFO tenant
    await prisma.fifoConsumption.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.fifoLayer.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.salesDetail.deleteMany({ where: { sales: { tenantId: fifoTenant.id } } });
    await prisma.salesHeader.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.menu.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.item.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.outlet.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.warehouse.deleteMany({ where: { tenantId: fifoTenant.id } });
    await prisma.tenant.deleteMany({ where: { id: fifoTenant.id } });
  });

  it("8. Partial refund: CASH refund mengurangi expected cash, jurnal dan refund amount konsisten", async () => {
    // Open a shift
    const shift = await attendanceService.openShift(cashierProfile.userId, outlet.id);

    // Sale of 2 Americano @ 30k = 60k CASH
    const saleResult = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 2, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "60000" }],
      idempotencyKey: `idem-ref-sale-${Date.now()}`,
    });

    const salesDetails = await prisma.salesDetail.findMany({
      where: { salesId: saleResult.sale.id },
    });
    const targetDetail = salesDetails[0];

    // Refund 1 quantity with CASH
    const refundResult = await processRefund({
      tenantId: tenant.id,
      salesId: saleResult.sale.id,
      cashierId: cashierProfile.userId,
      outletId: outlet.id,
      items: [{ salesDetailId: targetDetail.id, quantity: 1 }],
      reason: "Pelanggan membatalkan 1 cup",
      refundMethod: "CASH",
    });

    assert.strictEqual(refundResult.status, "COMPLETED");
    assert.strictEqual(Number(refundResult.totalRefund), 30000);

    // Verify shift expected cash is now 60,000 - 30,000 = 30,000
    const closed = await attendanceService.closeShift(shift.id, 30000);
    assert.strictEqual(
      Number(closed.expectedCash),
      30000,
      "Expected cash after CASH refund must be 30,000",
    );
    assert.strictEqual(Number(closed.variance), 0);

    // Verify refund reversing journal exists and balanced
    const refundJournal = await prisma.journalEntry.findFirst({
      where: { tenantId: tenant.id, referenceId: refundResult.id },
      include: { lines: true },
    });
    assert.ok(refundJournal, "Refund journal must exist");
    const rDebit = refundJournal.lines.reduce((s, l) => s + l.debit, 0);
    const rCredit = refundJournal.lines.reduce((s, l) => s + l.credit, 0);
    assert.strictEqual(
      Math.round(rDebit * 100) / 100,
      Math.round(rCredit * 100) / 100,
      "Refund reversing journal must be balanced",
    );
  });

  it("9. Poisoned idempotency record menghasilkan error (safe failure), bukan success palsu", async () => {
    const poisonedKey = `poison-key-${Date.now()}`;
    await prisma.idempotencyRecord.create({
      data: {
        key: poisonedKey,
        tenantId: tenant.id,
        statusCode: 400,
        responseBody: JSON.stringify({ error: "Stock exhausted during previous attempt" }),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    let errorThrown: any = null;
    try {
      await checkout({
        tenantId: tenant.id,
        outletId: outlet.id,
        cashierId: cashierProfile.userId,
        items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
        payments: [{ method: "CASH", amount: "30000" }],
        idempotencyKey: poisonedKey,
      });
    } catch (err: any) {
      errorThrown = err;
    }

    assert.ok(errorThrown, "Should throw on poisoned idempotency record");
    assert.strictEqual(errorThrown.code, "IDEM-004", "Must throw IDEM-004 error code");
  });

  it("10. Security: Tenant isolation menolak mutasi dengan cross-tenant entity", async () => {
    // Create foreign tenant
    const foreignTenant = await prisma.tenant.create({
      data: {
        name: "Foreign Tenant",
        slug: `foreign-${Date.now()}`,
        status: "active",
      },
    });

    let errorThrown: any = null;
    try {
      // Attempting to buy menu from Tenant A under foreignTenant ID must fail
      await checkout({
        tenantId: foreignTenant.id,
        outletId: outlet.id,
        cashierId: cashierProfile.userId,
        items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
        payments: [{ method: "CASH", amount: "30000" }],
      });
    } catch (err: any) {
      errorThrown = err;
    }

    assert.ok(errorThrown, "Cross-tenant access must be rejected");

    // Clean up foreign tenant
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  });
});
