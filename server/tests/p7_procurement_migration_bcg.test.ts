process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { prisma } from "../lib/prisma.ts";
import { migrationRoutes } from "../routes/migration.routes.ts";
import { supplierRoutes } from "../routes/supplier.routes.ts";
import { financeRoutes } from "../routes/finance.routes.ts";
import { sanitizeCsvFormula, MigrationService } from "../services/migration.service.ts";
import { ProcurementService } from "../services/procurement.service.ts";
import { SessionService } from "../services/session.service.ts";
import { Decimal } from "../utils/money.ts";

describe("Fase 7, 8 & 9: Migration, Procurement & BCG What-If Intelligence (§8.16, §8.17, §8.18)", () => {
  let app: FastifyInstance;
  let tenant: any;
  let warehouse: any;
  let outlet: any;
  let supplier: any;
  let supplierCatalogItem: any;
  let unitKg: any;
  let unitPcs: any;
  let rawItemCoffee: any;
  let rawItemMilk: any;
  let menuLatte: any;
  let menuColdBrew: any;
  let ownerProfile: any;
  let cashierProfile: any;
  let ownerToken: string;
  let cashierToken: string;

  before(async () => {
    app = Fastify();
    await app.register(fastifyCookie, { secret: "test_secret_cookie_32_characters_ok" });
    await app.register(migrationRoutes, { prefix: "/api/migration" });
    await app.register(supplierRoutes, { prefix: "/api/procurement" });
    await app.register(financeRoutes, { prefix: "/api/finance" });
    await app.ready();

    // 1. Create Tenant
    const uniqueSlug = `p7-tenant-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: "Fase 7-9 Roastery Test",
        slug: uniqueSlug,
        plan: "business",
        status: "active",
      },
    });

    warehouse = await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: "Gudang Utama P7",
        location: "Lantai 1",
      },
    });

    outlet = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: "Outlet Flagship P7",
        defaultWarehouseId: warehouse.id,
      },
    });

    unitKg = await prisma.unit.create({
      data: { tenantId: tenant.id, name: "Kilogram", symbol: "kg" },
    });
    unitPcs = await prisma.unit.create({
      data: { tenantId: tenant.id, name: "Pcs", symbol: "pcs" },
    });

    // 2. Setup Supplier and Catalog for Procurement
    supplier = await prisma.supplier.create({
      data: {
        name: "PT Biji Kopi Nusantara",
        contactEmail: `supplier-${Date.now()}@nusantara.id`,
        phone: "08123456789",
        address: "Medan, Sumatera Utara",
      },
    });

    supplierCatalogItem = await prisma.supplierCatalog.create({
      data: {
        supplierId: supplier.id,
        name: "Specialty Arabica Gayo Green Beans",
        category: "RAW_MATERIAL",
        unit: "kg",
        price: 120000,
        isActive: true,
      },
    });

    // 3. Setup Raw Materials & Menus for BCG and What-If
    rawItemCoffee = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `RAW-COF-${Date.now()}`,
        name: "Biji Kopi Gayo Roasted",
        category: "RAW_MATERIAL",
        unitId: unitKg.id,
        price: 150000,
        status: "ACTIVE",
      },
    });

    rawItemMilk = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: `RAW-MLK-${Date.now()}`,
        name: "Susu Segar Pasteur",
        category: "RAW_MATERIAL",
        unitId: unitKg.id,
        price: 25000,
        status: "ACTIVE",
      },
    });

    menuLatte = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: "Cafe Latte Single Origin",
        category: "COFFEE",
        price: 35000,
        isActive: true,
      },
    });

    menuColdBrew = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: "Artisan Cold Brew Bottle",
        category: "COFFEE",
        price: 45000,
        isActive: true,
      },
    });

    // Recipe for Latte
    await prisma.recipe.create({
      data: {
        tenantId: tenant.id,
        menuId: menuLatte.id,
        version: 1,
        effectiveFrom: new Date("2026-01-01"),
        details: {
          create: [
            { tenantId: tenant.id, itemId: rawItemCoffee.id, quantity: 0.02, unitId: unitKg.id },
            { tenantId: tenant.id, itemId: rawItemMilk.id, quantity: 0.2, unitId: unitKg.id },
          ],
        },
      },
    });

    // Cost Allocation Config for True Cost
    await prisma.costAllocationConfig.create({
      data: {
        tenantId: tenant.id,
        monthlyLaborExpense: 10000000,
        monthlyOperationalExpense: 7000000,
        allocationMethod: "REVENUE",
      },
    });

    // 4. Create User Profiles (Owner & Cashier) for RBAC & Zero-Cost Visibility
    ownerProfile = await prisma.userProfile.create({
      data: {
        userId: `owner-p7-${Date.now()}`,
        tenant: { connect: { id: tenant.id } },
        role: "OWNER",
        fullName: "Bapak Owner Roastery",
        status: "active",
      },
    });

    cashierProfile = await prisma.userProfile.create({
      data: {
        userId: `cashier-p7-${Date.now()}`,
        tenant: { connect: { id: tenant.id } },
        role: "CASHIER",
        fullName: "Mbak Kasir Depan",
        status: "active",
      },
    });

    const ownerSession = await SessionService.createSession(
      ownerProfile.id,
      tenant.id,
      null,
      "127.0.0.1",
      "Owner Device",
    );
    ownerToken = ownerSession.rawToken;

    const cashierSession = await SessionService.createSession(
      cashierProfile.id,
      tenant.id,
      null,
      "127.0.0.1",
      "Cashier Tablet",
    );
    cashierToken = cashierSession.rawToken;
  });

  after(async () => {
    await app.close();
    // Cascade Teardown
    await prisma.journalLine.deleteMany({ where: { journalEntry: { tenantId: tenant.id } } });
    await prisma.journalEntry.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.account.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.receivingDetail.deleteMany({ where: { receiving: { tenantId: tenant.id } } });
    await prisma.receiving.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.purchaseOrderDetail.deleteMany({ where: { purchaseOrder: { tenantId: tenant.id } } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.supplierCatalog.deleteMany({ where: { supplierId: supplier.id } });
    await prisma.supplier.deleteMany({ where: { id: supplier.id } });
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.fifoLayer.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.inventoryBalance.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.recipeDetail.deleteMany({ where: { recipe: { menu: { tenantId: tenant.id } } } });
    await prisma.recipe.deleteMany({ where: { menu: { tenantId: tenant.id } } });
    await prisma.menu.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.item.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.costAllocationConfig.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.session.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userProfile.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.outlet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.warehouse.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.unit.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.numberSequence.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  });

  describe("1. Formula Injection Sanitization (§8.17, CWE-1236)", () => {
    it("Harus mencegah CSV / Formula Injection dengan menambahkan prefix kutip tunggal pada trigger characters", () => {
      assert.equal(sanitizeCsvFormula("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0");
      assert.equal(sanitizeCsvFormula("+12345678"), "'+12345678");
      assert.equal(sanitizeCsvFormula("-50000"), "'-50000");
      assert.equal(sanitizeCsvFormula("@SUM(A1:A10)"), "'@SUM(A1:A10)");
      assert.equal(sanitizeCsvFormula("\tTAB_INJECTION"), "'\tTAB_INJECTION");
      assert.equal(sanitizeCsvFormula("\rRETURN_INJECTION"), "'\rRETURN_INJECTION");
      
      // Safe string remains unmodified
      assert.equal(sanitizeCsvFormula("Arabica Gayo Clean"), "Arabica Gayo Clean");
      assert.equal(sanitizeCsvFormula(12345), "12345");
      assert.equal(sanitizeCsvFormula(null), "");
      assert.equal(sanitizeCsvFormula(undefined), "");
    });
  });

  describe("2. Migration Opening Balance Ingestion & Double-Entry Equity Posting (§8.17)", () => {
    it("Harus menolak kuantitas negatif atau biaya satuan nol/negatif (True Cost strictly forbids zero cost)", async () => {
      // 1. Negative quantity test
      await assert.rejects(
        async () => {
          await MigrationService.importOpeningBalance({
            tenantId: tenant.id,
            warehouseId: warehouse.id,
            items: [
              {
                sku: "BAD-QTY",
                name: "Bad Item",
                unitSymbol: "kg",
                quantity: -5,
                unitCost: 100000,
              },
            ],
          });
        },
        (err: any) => {
          assert.equal(err.code, "VAL-001");
          assert.ok(err.message.includes("tidak boleh negatif"));
          return true;
        },
      );

      // 2. Zero cost test
      await assert.rejects(
        async () => {
          await MigrationService.importOpeningBalance({
            tenantId: tenant.id,
            warehouseId: warehouse.id,
            items: [
              {
                sku: "ZERO-COST",
                name: "Zero Cost Item",
                unitSymbol: "kg",
                quantity: 10,
                unitCost: 0,
              },
            ],
          });
        },
        (err: any) => {
          assert.equal(err.code, "VAL-001");
          assert.ok(err.message.includes("lebih besar dari 0"));
          return true;
        },
      );
    });

    it("Harus sukses mengimpor saldo awal persediaan, membuat FifoLayer, dan memposting Jurnal Ekuitas seimbang (Debit = Credit)", async () => {
      const itemsPayload = [
        {
          sku: `=SKU-MIG-1-${Date.now()}`, // will be sanitized to '=SKU-MIG...
          name: "Biji Kopi Flores Bajawa",
          unitSymbol: "kg",
          quantity: 10,
          unitCost: 150000, // Rp 1.500.000
        },
        {
          sku: `SKU-MIG-2-${Date.now()}`,
          name: "Sirup Karamel 750ml",
          unitSymbol: "btl",
          quantity: 20,
          unitCost: 40000, // Rp 800.000
        },
      ];

      const res = await app.inject({
        method: "POST",
        url: "/api/migration/opening-balance",
        headers: { "content-type": "application/json" },
        payload: {
          tenantId: tenant.id,
          warehouseId: warehouse.id,
          items: itemsPayload,
          notes: "Saldo Awal Migrasi Cut-Off 2026",
        },
      });

      assert.equal(res.statusCode, 201);
      const json = JSON.parse(res.payload);
      assert.equal(json.success, true);
      assert.equal(json.data.importedCount, 2);
      // Rp 1.500.000 + Rp 800.000 = Rp 2.300.000
      assert.equal(json.data.totalOpeningValue, 2300000);
      assert.ok(json.data.journalNumber.startsWith("JRN-"));

      // 1. Verify Balanced Journal Entry in Database (Debit = Credit)
      const journal = await prisma.journalEntry.findFirst({
        where: { tenantId: tenant.id, entryNumber: json.data.journalNumber },
        include: { lines: { include: { account: true } } },
      });

      assert.ok(journal);
      assert.equal(journal.lines.length, 2);

      const debitLine = journal.lines.find((l) => l.debit > 0);
      const creditLine = journal.lines.find((l) => l.credit > 0);

      assert.ok(debitLine);
      assert.ok(creditLine);
      assert.equal(debitLine.account.code, "PERSEDIAAN");
      assert.equal(debitLine.debit, 2300000);
      assert.equal(creditLine.account.code, "MODAL_AWAL");
      assert.equal(creditLine.credit, 2300000);
      assert.equal(debitLine.debit, creditLine.credit, "Debit dan Credit Jurnal Saldo Awal wajib seimbang sempurna!");

      // 2. Verify FifoLayers created
      const layers = await prisma.fifoLayer.findMany({
        where: { tenantId: tenant.id, warehouseId: warehouse.id },
      });
      assert.ok(layers.length >= 2);
      const floresLayer = layers.find((l) => l.unitCost === 150000);
      assert.ok(floresLayer);
      assert.equal(floresLayer.quantity, 10);
      assert.equal(floresLayer.remainingQty, 10);
      assert.equal(floresLayer.isExhausted, false);

      // 3. Verify InventoryLedger append-only records
      const ledgers = await prisma.inventoryLedger.findMany({
        where: { tenantId: tenant.id, movementType: "OPENING_BALANCE" },
      });
      assert.ok(ledgers.length >= 2);
    });
  });

  describe("3. Internal Procurement: PO Creation & QC Receiving (§8.16)", () => {
    let createdPOId: string;
    let poNumber: string;

    it("Harus sukses membuat Purchase Order baru ke Supplier via /api/procurement/orders", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/procurement/orders",
        headers: { "content-type": "application/json" },
        payload: {
          tenantId: tenant.id,
          supplierId: supplier.id,
          outletId: outlet.id,
          items: [
            {
              catalogId: supplierCatalogItem.id,
              quantity: 15,
              unitPrice: 120000, // 15 * 120.000 = 1.800.000
              notes: "Kemasan karung goni 15kg",
            },
          ],
          notes: "Pengadaan Biji Kopi Gayo Rutin",
        },
      });

      assert.equal(res.statusCode, 201);
      const json = JSON.parse(res.payload);
      assert.equal(json.success, true);
      assert.ok(json.data.poNumber.startsWith("PO-"));
      assert.equal(json.data.totalAmount, 1800000);

      createdPOId = json.data.id;
      poNumber = json.data.poNumber;

      // Verify PO state in DB
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: createdPOId },
        include: { details: true },
      });
      assert.ok(po);
      assert.equal(po.status, "PENDING");
      assert.equal(po.details.length, 1);
      assert.equal(po.details[0].totalPrice, 1800000);
    });

    it("Harus memproses QC Receiving barang, menambah stok fisik, dan memposting Jurnal Hutang Usaha (Debit = Credit)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/procurement/receive",
        headers: { "content-type": "application/json" },
        payload: {
          tenantId: tenant.id,
          purchaseOrderId: createdPOId,
          outletId: outlet.id,
          warehouseId: warehouse.id,
          items: [
            {
              catalogId: supplierCatalogItem.id,
              itemId: rawItemCoffee.id,
              quantityReceived: 15,
              unitCost: 120000, // Total 1.800.000
            },
          ],
          notes: "Barang lolos QC kadar air < 12%",
        },
      });

      assert.equal(res.statusCode, 200);
      const json = JSON.parse(res.payload);
      assert.equal(json.success, true);
      assert.equal(json.data.totalValue, 1800000);
      assert.equal(json.data.itemsCount, 1);
      assert.ok(json.data.journalNumber.startsWith("JRN-"));

      // 1. Verify PO status updated to COMPLETED
      const po = await prisma.purchaseOrder.findUnique({ where: { id: createdPOId } });
      assert.equal(po?.status, "COMPLETED");
      assert.ok(po?.deliveredAt);

      // 2. Verify Inventory Balance increased
      const balance = await prisma.inventoryBalance.findFirst({
        where: { tenantId: tenant.id, itemId: rawItemCoffee.id, warehouseId: warehouse.id },
      });
      assert.ok(balance);
      assert.equal(balance.currentStock, 15);

      // 3. Verify Balanced Journal Entry: Debit PERSEDIAAN, Credit HUTANG_USAHA
      const journal = await prisma.journalEntry.findFirst({
        where: { tenantId: tenant.id, entryNumber: json.data.journalNumber },
        include: { lines: { include: { account: true } } },
      });
      assert.ok(journal);
      assert.equal(journal.lines.length, 2);

      const debitLine = journal.lines.find((l) => l.debit > 0);
      const creditLine = journal.lines.find((l) => l.credit > 0);
      assert.ok(debitLine);
      assert.ok(creditLine);
      assert.equal(debitLine.account.code, "PERSEDIAAN");
      assert.equal(debitLine.debit, 1800000);
      assert.equal(creditLine.account.code, "HUTANG_USAHA");
      assert.equal(creditLine.credit, 1800000);
      assert.equal(debitLine.debit, creditLine.credit, "Debit & Credit Jurnal PO Penerimaan harus seimbang!");
    });

    it("Harus menolak penerimaan ganda pada PO yang sudah COMPLETED", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/procurement/receive",
        headers: { "content-type": "application/json" },
        payload: {
          tenantId: tenant.id,
          purchaseOrderId: createdPOId,
          outletId: outlet.id,
          warehouseId: warehouse.id,
          items: [
            {
              catalogId: supplierCatalogItem.id,
              itemId: rawItemCoffee.id,
              quantityReceived: 15,
              unitCost: 120000,
            },
          ],
        },
      });

      assert.equal(res.statusCode, 400);
      const json = JSON.parse(res.payload);
      assert.equal(json.success, false);
      assert.equal(json.error, "VAL-001");
      assert.ok(json.message.includes("sudah selesai diterima"));
    });
  });

  describe("4. BCG Menu Matrix & Zero-Cost Visibility (§8.18, Rule 5)", () => {
    it("Kasir dilarang keras mengakses BCG Matrix (Zero-Cost Visibility Mandat)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/finance/bcg-matrix",
        cookies: {
          ll_session: cashierToken,
        },
      });

      assert.equal(res.statusCode, 403);
      const json = JSON.parse(res.payload);
      assert.equal(json.error, "FORBIDDEN");
    });

    it("Owner dapat mengakses BCG Matrix dan menerima pembagian 4 kuadran menu dengan rekomendasi bisnis", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/finance/bcg-matrix",
        cookies: {
          ll_session: ownerToken,
        },
      });

      assert.equal(res.statusCode, 200);
      const json = JSON.parse(res.payload);
      assert.equal(json.success, true);
      assert.ok(json.data.thresholds);
      assert.ok(json.data.quadrants);
      assert.ok(Array.isArray(json.data.matrix));

      for (const item of json.data.matrix) {
        assert.ok(["STAR", "CASH_COW", "QUESTION_MARK", "DOG"].includes(item.quadrant));
        assert.ok(typeof item.recommendation === "string" && item.recommendation.length > 0);
        assert.ok(item.sellingPrice >= 0);
        assert.ok(item.trueCostPerUnit >= 0);
      }
    });
  });

  describe("5. What-If Margin & Profit Simulation (§8.18)", () => {
    it("Kasir dilarang mengakses simulasi margin What-If", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/finance/simulate-what-if",
        cookies: {
          ll_session: cashierToken,
        },
        payload: {
          materialPriceAdjustments: [{ itemId: rawItemCoffee.id, percentChange: 15 }],
        },
      });

      assert.equal(res.statusCode, 403);
      const json = JSON.parse(res.payload);
      assert.equal(json.error, "FORBIDDEN");
    });

    it("Owner dapat mensimulasikan kenaikan harga bahan baku (+15%) dan melihat dampak margin", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/finance/simulate-what-if",
        cookies: {
          ll_session: ownerToken,
        },
        payload: {
          materialPriceAdjustments: [{ itemId: rawItemCoffee.id, percentChange: 15 }],
          sellingPriceAdjustments: [{ menuId: menuLatte.id, newPrice: 38000 }],
        },
      });

      assert.equal(res.statusCode, 200);
      const json = JSON.parse(res.payload);
      assert.equal(json.success, true);
      assert.ok(json.data.simulatedProducts);
      assert.ok(json.data.aggregateComparison);

      const simLatte = json.data.simulatedProducts.find((p: any) => p.menuId === menuLatte.id);
      assert.ok(simLatte);
      assert.equal(simLatte.simulatedSellingPrice, 38000);
      // Cost should have increased because coffee beans increased by 15%
      assert.ok(simLatte.simulatedTrueCost >= simLatte.baselineTrueCost);
      assert.ok(typeof simLatte.marginDeltaAmount === "number");
    });
  });

  after(async () => {
    if (app) await app.close();
  });
});

