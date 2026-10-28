process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/prisma.ts";
import { AttendanceService } from "../services/shift.service.ts";
import { StockOpnameService } from "../services/inventory.service.ts";
import { checkout } from "../services/checkout.service.ts";
import { Decimal } from "../utils/money.ts";

describe("Fase 6: Shift Closing & Stock Opname BIZ-010 Per-Item Reconciliation (§6.10, §8.10, §8.11, §8.12)", () => {
  let tenant: any;
  let outlet: any;
  let warehouse: any;
  let unitKg: any;
  let unitPcs: any;
  let coffeeItem: any;
  let teaItem: any;
  let menuAmericano: any;
  let menuTea: any;
  let cashierProfile: any;
  let attendanceService: AttendanceService;
  let opnameService: StockOpnameService;

  before(async () => {
    attendanceService = new AttendanceService();
    opnameService = new StockOpnameService();

    // 1. Setup Isolated Tenant
    const uniqueSlug = `p6-tenant-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: "Fase 6 Roastery & Cafe",
        slug: uniqueSlug,
        plan: "business",
        status: "active",
        timezone: "Asia/Jakarta",
        isTaxInclusive: true,
        serviceChargeRate: 0,
      },
    });

    warehouse = await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: "Gudang Fase 6",
        location: "Outlet Utama",
      },
    });

    outlet = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: "Outlet Utama Fase 6",
        defaultWarehouseId: warehouse.id,
      },
    });

    unitKg = await prisma.unit.create({
      data: { tenantId: tenant.id, name: "Gram", symbol: "g" },
    });
    unitPcs = await prisma.unit.create({
      data: { tenantId: tenant.id, name: "Pieces", symbol: "pcs" },
    });

    // 2. Raw Materials
    coffeeItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `COF-P6-${Date.now()}`,
        name: "Biji Kopi Arabika",
        category: "RAW_MATERIAL",
        unitId: unitKg.id,
        price: 200,
        status: "ACTIVE",
      },
    });

    teaItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `TEA-P6-${Date.now()}`,
        name: "Daun Teh Melati",
        category: "RAW_MATERIAL",
        unitId: unitKg.id,
        price: 150,
        status: "ACTIVE",
      },
    });

    // Initial Inventory Balance
    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: coffeeItem.id,
        currentStock: 1000,
        averageCost: 200,
        version: 0,
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: teaItem.id,
        currentStock: 1000,
        averageCost: 150,
        version: 0,
      },
    });

    // 3. Menus & Recipes
    menuAmericano = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: "Hot Americano P6",
        price: 25000,
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
          ],
        },
      },
    });

    menuTea = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: "Iced Jasmine Tea P6",
        price: 18000,
        category: "Tea",
        isActive: true,
      },
    });

    await prisma.recipe.create({
      data: {
        tenantId: tenant.id,
        menuId: menuTea.id,
        version: 1,
        effectiveFrom: new Date("2026-01-01"),
        details: {
          create: [
            { tenantId: tenant.id, itemId: teaItem.id, quantity: 10, unitId: unitKg.id },
          ],
        },
      },
    });

    cashierProfile = await prisma.userProfile.create({
      data: {
        userId: `cashier-p6-${Date.now()}`,
        tenantId: tenant.id,
        role: "KASIR",
        fullName: "Kasir Shift P6",
        status: "active",
      },
    });

    // Base numbering sequences
    await prisma.numberSequence.createMany({
      data: [
        { tenantId: tenant.id, prefix: "INV", year: new Date().getFullYear().toString(), lastNumber: 0 },
        { tenantId: tenant.id, prefix: "JRN", year: new Date().getFullYear().toString(), lastNumber: 0 },
      ],
    });

    // Active Accounting Period
    await prisma.period.create({
      data: {
        tenantId: tenant.id,
        name: "Oktober 2026",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-31"),
        status: "OPEN",
      },
    });
  });

  after(async () => {
    // Teardown
    await prisma.period.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.stockOpname.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.attendanceLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.shift.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outbox.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.dailyMenuStat.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.kitchenOrder.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.fifoConsumption.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.fifoAllocationJob.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.salesDetail.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.payment.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.salesHeader.deleteMany({ where: { tenantId: tenant.id } });
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
    await prisma.numberSequence.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userProfile.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outlet.updateMany({ where: { tenantId: tenant.id }, data: { defaultWarehouseId: null } });
    await prisma.outlet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.warehouse.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  });

  it("1. Blind Cash Count Shift Closing dengan Defisit Kas: Memposting Jurnal Selisih Kas Seimbang (§8.10)", async () => {
    const shift = await attendanceService.openShift(cashierProfile.userId, outlet.id);
    assert.ok(shift);

    // Lakukan penjualan CASH Rp50.000
    await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 2, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "50000" }],
      discountPercent: 0,
      idempotencyKey: `idem-p6-shift1-${Date.now()}`,
    });

    // Kasir hitung fisik: uang di laci ternyata hanya Rp45.000 (defisit Rp5.000)
    const closed = await attendanceService.closeShift(shift.id, 45000);
    assert.strictEqual(Number(closed.expectedCash), 50000);
    assert.strictEqual(Number(closed.actualCash), 45000);
    assert.strictEqual(Number(closed.variance), -5000);

    // Verifikasi jurnal selisih kas terposting
    const journal = await prisma.journalEntry.findFirst({
      where: {
        tenantId: tenant.id,
        referenceType: "SHIFT_CLOSING",
        referenceId: shift.id,
      },
      include: { lines: { include: { account: true } } },
    });

    assert.ok(journal, "Jurnal SHIFT_CLOSING wajib terbuat");
    const totalDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = journal.lines.reduce((s, l) => s + l.credit, 0);
    assert.strictEqual(totalDebit, 5000, "Debit harus Rp5.000");
    assert.strictEqual(totalCredit, 5000, "Credit harus Rp5.000");
    assert.strictEqual(totalDebit, totalCredit, "Jurnal harus seimbang sempurna Debit == Credit");

    // Pastikan akun yang didebit adalah Beban Selisih Kas dan akun yang dikredit adalah Kas
    const debitLine = journal.lines.find((l) => l.debit > 0);
    const creditLine = journal.lines.find((l) => l.credit > 0);
    assert.strictEqual(debitLine?.account.code, "SELISIH_KAS_BEBAN");
    assert.strictEqual(creditLine?.account.code, "KAS");
  });

  it("2. Blind Cash Count Shift Closing dengan Surplus Kas: Memposting Jurnal Pendapatan Selisih Kas (§8.10)", async () => {
    const shift = await attendanceService.openShift(cashierProfile.userId, outlet.id);
    assert.ok(shift);

    // Lakukan penjualan CASH Rp50.000
    await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 2, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "50000" }],
      discountPercent: 0,
      idempotencyKey: `idem-p6-shift2-${Date.now()}`,
    });

    // Kasir hitung fisik: uang di laci ternyata Rp55.000 (surplus Rp5.000)
    const closed = await attendanceService.closeShift(shift.id, 55000);
    assert.strictEqual(Number(closed.expectedCash), 50000);
    assert.strictEqual(Number(closed.actualCash), 55000);
    assert.strictEqual(Number(closed.variance), 5000);

    const journal = await prisma.journalEntry.findFirst({
      where: {
        tenantId: tenant.id,
        referenceType: "SHIFT_CLOSING",
        referenceId: shift.id,
      },
      include: { lines: { include: { account: true } } },
    });

    assert.ok(journal);
    const totalDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = journal.lines.reduce((s, l) => s + l.credit, 0);
    assert.strictEqual(totalDebit, 5000);
    assert.strictEqual(totalCredit, 5000);

    const debitLine = journal.lines.find((l) => l.debit > 0);
    const creditLine = journal.lines.find((l) => l.credit > 0);
    assert.strictEqual(debitLine?.account.code, "KAS");
    assert.strictEqual(creditLine?.account.code, "SELISIH_KAS_PENDAPATAN");
  });

  it("3. BIZ-010 Per-Item Lock: Mengunci HANYA item yang di-opname tanpa memblokir menu lain (§8.11, Dokumen Teks Baru #12)", async () => {
    // Buat Stock Opname aktif HANYA untuk coffeeItem
    const opname = await opnameService.create({
      tenantId: tenant.id,
      outletId: outlet.id,
      itemId: coffeeItem.id,
      physicalStock: 900,
      estimatedUnitCost: 200,
      notes: "Opname Biji Kopi Mingguan",
    });

    assert.strictEqual(opname.status, "draft");

    // 3a. Checkout Americano (menggunakan coffeeItem) -> HARUS DITOLAK BIZ-010
    await assert.rejects(
      async () => {
        await checkout({
          tenantId: tenant.id,
          outletId: outlet.id,
          cashierId: cashierProfile.userId,
          items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
          payments: [{ method: "CASH", amount: "25000" }],
          discountPercent: 0,
          idempotencyKey: `idem-p6-blk-${Date.now()}`,
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, "BIZ-010");
        assert.ok(err.message.includes("Stock Opname aktif"));
        return true;
      }
    );

    // 3b. Checkout Teh Melati (menggunakan teaItem, TIDAK di-opname) -> HARUS BERHASIL!
    const teaSale = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuTea.id, quantity: 1, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "18000" }],
      discountPercent: 0,
      idempotencyKey: `idem-p6-ok-${Date.now()}`,
    });

    assert.ok(teaSale.sale.id, "Penjualan menu yang bahannya tidak di-opname tetap berjalan normal");
  });

  it("4. Stock Opname Confirmation & Shrinkage Journal: Menyesuaikan stok fisik dan memposting jurnal kerugian persediaan (§8.12)", async () => {
    const activeOpname = await prisma.stockOpname.findFirst({
      where: { tenantId: tenant.id, itemId: coffeeItem.id, status: "draft" },
    });
    assert.ok(activeOpname);

    // Konfirmasi opname
    const confirmed = await opnameService.confirm(activeOpname.id, cashierProfile.userId);
    assert.strictEqual(confirmed.status, "confirmed");

    // Verifikasi saldo stok fisik di inventoryBalance telah terupdate ke 900
    const bal = await prisma.inventoryBalance.findFirst({
      where: { tenantId: tenant.id, itemId: coffeeItem.id, warehouseId: warehouse.id },
    });
    assert.strictEqual(bal?.currentStock, 900);

    // Verifikasi jurnal penyesuaian persediaan
    const opnameJournal = await prisma.journalEntry.findFirst({
      where: {
        tenantId: tenant.id,
        referenceType: "STOCK_OPNAME",
        referenceId: activeOpname.id,
      },
      include: { lines: { include: { account: true } } },
    });

    assert.ok(opnameJournal, "Jurnal STOCK_OPNAME wajib terposting");
    const totalDebit = opnameJournal.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = opnameJournal.lines.reduce((s, l) => s + l.credit, 0);
    assert.ok(totalDebit > 0, "Harus ada nilai penyesuaian kerugian");
    assert.strictEqual(totalDebit, totalCredit, "Jurnal persediaan harus seimbang Debit == Credit");

    const debitLine = opnameJournal.lines.find((l) => l.debit > 0);
    const creditLine = opnameJournal.lines.find((l) => l.credit > 0);
    assert.strictEqual(debitLine?.account.code, "BEBAN_KERUGIAN_PERSEDIAAN");
    assert.strictEqual(creditLine?.account.code, "PERSEDIAAN");

    // 4b. Verifikasi kunci opname telah lepas: Americano kini bisa di-checkout normal
    const retryAmericano = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuAmericano.id, quantity: 1, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "25000" }],
      discountPercent: 0,
      idempotencyKey: `idem-p6-after-opname-${Date.now()}`,
    });

    assert.ok(retryAmericano.sale.id, "Americano berhasil checkout setelah opname selesai");
  });
});
