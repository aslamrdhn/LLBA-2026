process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/prisma.ts";
import { checkout } from "../services/checkout.service.ts";
import { PhysicalStockService } from "../services/physical-stock.service.ts";
import { Decimal } from "../utils/money.ts";
import Fastify from "fastify";
import { posRoutes } from "../routes/pos.routes.ts";
import { inventoryRoutes } from "../routes/inventory.routes.ts";
import cookie from "@fastify/cookie";

import { SessionService } from "../services/session.service.ts";

describe("Fase 3: POS Checkout, Recipe Snapshot & Offline Sync (§6.10, §8.9b, BIZ-010)", () => {
  let tenant: any;
  let outlet: any;
  let warehouse: any;
  let unitKg: any;
  let unitPcs: any;
  let coffeeItem: any;
  let cupItem: any;
  let menuLatte: any;
  let cashierProfile: any;
  let cashierToken: string;
  let app: any;

  before(async () => {
    // 1. Setup Isolated Tenant
    const uniqueSlug = `p3-tenant-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: "Fase 3 Coffee Shop",
        slug: uniqueSlug,
        plan: "business",
        status: "active",
        timezone: "Asia/Jakarta",
        isTaxInclusive: false,
        serviceChargeRate: 5,
      },
    });

    warehouse = await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: "Gudang Fase 3",
        location: "Bar Depan",
      },
    });

    outlet = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: "Outlet Fase 3",
        defaultWarehouseId: warehouse.id,
      },
    });

    unitKg = await prisma.unit.create({
      data: { tenantId: tenant.id, name: "Kilogram", symbol: "kg" },
    });

    unitPcs = await prisma.unit.create({
      data: { tenantId: tenant.id, name: "Piece", symbol: "pcs" },
    });

    coffeeItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `COF-P3-${Date.now()}`,
        name: "Espresso Beans Blend P3",
        category: "Bahan Baku",
        unitId: unitKg.id,
        price: 300, // Rp 300 / gram
        status: "ACTIVE",
      },
    });

    cupItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `CUP-P3-${Date.now()}`,
        name: "Hot Cup 12oz P3",
        category: "Kemasan",
        unitId: unitPcs.id,
        price: 2000,
        status: "ACTIVE",
      },
    });

    // Opening inventory: 2000g coffee, 500 cups
    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: coffeeItem.id,
        currentStock: 2000,
        averageCost: 250,
        version: 0,
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        itemId: cupItem.id,
        currentStock: 500,
        averageCost: 1800,
        version: 0,
      },
    });

    menuLatte = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: "Caffe Latte P3",
        price: 35000,
        category: "Coffee",
        isActive: true,
      },
    });

    await prisma.recipe.create({
      data: {
        tenantId: tenant.id,
        menuId: menuLatte.id,
        version: 1,
        effectiveFrom: new Date("2026-01-01"),
        details: {
          create: [
            { tenantId: tenant.id, itemId: coffeeItem.id, quantity: 20, unitId: unitKg.id },
            { tenantId: tenant.id, itemId: cupItem.id, quantity: 1, unitId: unitPcs.id },
          ],
        },
      },
    });

    cashierProfile = await prisma.userProfile.create({
      data: {
        userId: `cashier-p3-${Date.now()}`,
        tenantId: tenant.id,
        role: "KASIR",
        fullName: "Kasir Fase 3 Test",
        pinHash: "hash-p3",
        status: "active",
        assignedOutlets: JSON.stringify([outlet.id]),
      },
    });

    // Number sequences
    for (const prefix of ["INV", "JRN", "PO", "RCV"]) {
      await prisma.numberSequence.create({
        data: {
          tenantId: tenant.id,
          prefix,
          year: new Date().getFullYear().toString(),
          lastNumber: 0,
        },
      });
    }

    // Active Period
    const now = new Date();
    await prisma.period.create({
      data: {
        tenantId: tenant.id,
        name: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        status: "OPEN",
      },
    });

    // Valid Session
    const sessionRes = await SessionService.createSession(
      cashierProfile.id,
      tenant.id,
      outlet.id,
    );
    cashierToken = sessionRes.rawToken;

    // 2. Setup Fastify Test App for Routes
    app = Fastify();
    await app.register(cookie);

    await app.register(posRoutes, { prefix: "/api/pos" });
    await app.register(inventoryRoutes, { prefix: "/api/inventory" });
    await app.ready();
  });

  after(async () => {
    await app.close();
    // Cleanup tenant test data
    await prisma.offlineTransaction.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.stockOpname.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.kitchenOrder.deleteMany({ where: { sales: { tenantId: tenant.id } } });
    await prisma.fifoConsumption.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.fifoAllocationJob.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outbox.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.dailyMenuStat.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
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
    await prisma.period.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.numberSequence.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.session.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userProfile.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outlet.updateMany({ where: { tenantId: tenant.id }, data: { defaultWarehouseId: null } });
    await prisma.outlet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.warehouse.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  });

  it("1. BIZ-010: Menolak checkout jika gudang sedang dalam proses Stock Opname aktif", async () => {
    // Buat opname aktif (status in_progress)
    const opname = await prisma.stockOpname.create({
      data: {
        tenantId: tenant.id,
        outletId: outlet.id,
        itemId: coffeeItem.id,
        systemStock: 2000,
        physicalStock: 1980,
        difference: -20,
        status: "in_progress",
      },
    });

    // Cek endpoint pending-check
    const checkRes = await app.inject({
      method: "GET",
      url: `/api/inventory/opname/pending-check?outletId=${outlet.id}`,
      cookies: { ll_session: cashierToken },
    });
    assert.strictEqual(checkRes.statusCode, 200);
    const checkBody = JSON.parse(checkRes.body);
    assert.strictEqual(checkBody.isOpnamePending, true);

    // Percobaan checkout harus gagal dengan BIZ-010
    await assert.rejects(
      async () => {
        await checkout({
          tenantId: tenant.id,
          outletId: outlet.id,
          cashierId: cashierProfile.userId,
          items: [{ menuId: menuLatte.id, quantity: 1, discountAmount: 0 }],
          payments: [{ method: "CASH", amount: "40000" }],
          discountPercent: 0,
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, "BIZ-010");
        return true;
      }
    );

    // Selesaikan opname (status completed)
    await prisma.stockOpname.update({
      where: { id: opname.id },
      data: { status: "completed" },
    });

    const checkResAfter = await app.inject({
      method: "GET",
      url: `/api/inventory/opname/pending-check?outletId=${outlet.id}`,
      cookies: { ll_session: cashierToken },
    });
    const checkBodyAfter = JSON.parse(checkResAfter.body);
    assert.strictEqual(checkBodyAfter.isOpnamePending, false);
  });

  it("2. Normal Checkout: Mengonsumsi stok fisik via PhysicalStockService dan menyematkan RecipeVersionSnapshot SHA-256", async () => {
    const saleResult = await checkout({
      tenantId: tenant.id,
      outletId: outlet.id,
      cashierId: cashierProfile.userId,
      items: [{ menuId: menuLatte.id, quantity: 2, discountAmount: 0 }],
      payments: [{ method: "CASH", amount: "80000" }],
      discountPercent: 0,
      idempotencyKey: `idem-p3-${Date.now()}`,
    });

    assert.ok(saleResult.sale);
    assert.strictEqual(saleResult.sale.status, "POSTED");

    // Periksa SalesDetail memiliki snapshot resep dengan SHA-256 hash valid
    const salesDetail = await prisma.salesDetail.findFirst({
      where: { salesId: saleResult.sale.id },
    });
    assert.ok(salesDetail);
    assert.ok(salesDetail.recipeSnapshot);

    const parsedSnapshot = JSON.parse(salesDetail.recipeSnapshot);
    assert.ok(parsedSnapshot.recipeHash);
    assert.strictEqual(parsedSnapshot.recipeHash.length, 64, "SHA-256 hash harus 64 hex characters");

    // Verifikasi stok berkurang tepat: 2 latte * 20g kopi = 40g (2000 -> 1960g), 2 cup (500 -> 498)
    const coffeeBal = await prisma.inventoryBalance.findFirst({
      where: { tenantId: tenant.id, itemId: coffeeItem.id },
    });
    assert.strictEqual(coffeeBal?.currentStock, 1960);

    const cupBal = await prisma.inventoryBalance.findFirst({
      where: { tenantId: tenant.id, itemId: cupItem.id },
    });
    assert.strictEqual(cupBal?.currentStock, 498);

    // Verifikasi jurnal seimbang
    const journal = await prisma.journalEntry.findFirst({
      where: { tenantId: tenant.id, referenceId: saleResult.sale.id },
      include: { lines: true },
    });
    assert.ok(journal);
    const totalDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = journal.lines.reduce((s, l) => s + l.credit, 0);
    assert.strictEqual(Math.round(totalDebit), Math.round(totalCredit));
  });

  it("3. Offline Sync (§8.9b): Memproses batch transaksi offline dan mendeteksi celah nomor struk (Receipt Gap Recovery)", async () => {
    const offlineTxs = [
      {
        offlineId: `off-1-${Date.now()}`,
        receiptSeq: 101,
        items: [{ menuId: menuLatte.id, quantity: 1, discountAmount: 0 }],
        payments: [{ method: "CASH", amount: "40000" }],
        discountPercent: 0,
        offlineCreatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      // Celah: seq 102 hilang/lompat ke 103!
      {
        offlineId: `off-2-${Date.now()}`,
        receiptSeq: 103,
        items: [{ menuId: menuLatte.id, quantity: 1, discountAmount: 0 }],
        payments: [{ method: "CASH", amount: "40000" }],
        discountPercent: 0,
        offlineCreatedAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];

    const syncRes = await app.inject({
      method: "POST",
      url: "/api/pos/checkout/offline-sync",
      cookies: { ll_session: cashierToken },
      payload: {
        outletId: outlet.id,
        transactions: offlineTxs,
      },
    });

    assert.strictEqual(syncRes.statusCode, 200);
    const syncBody = JSON.parse(syncRes.body);
    assert.strictEqual(syncBody.success, true);
    assert.strictEqual(syncBody.summary.total, 2);
    assert.strictEqual(syncBody.summary.synced, 2);
    assert.strictEqual(syncBody.summary.failed, 0);
    assert.strictEqual(syncBody.summary.receiptGapDetected, true);
    assert.deepStrictEqual(syncBody.summary.detectedGaps, [102]);

    // Verifikasi status tersimpan di tabel OfflineTransaction
    const savedOff1 = await prisma.offlineTransaction.findUnique({
      where: {
        tenantId_offlineId: { tenantId: tenant.id, offlineId: offlineTxs[0].offlineId },
      },
    });
    assert.strictEqual(savedOff1?.status, "SYNCED");
    assert.ok(savedOff1?.salesId);
  });

  after(async () => {
    if (app) await app.close();
  });
});

