import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (!process.env.SQLITE_URL) {
  const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');
  process.env.SQLITE_URL = `file:${dbPath}`;
}

const activeUrl = process.env.DATABASE_URL || process.env.SQLITE_URL;
const prisma = new PrismaClient(activeUrl ? { datasources: { db: { url: activeUrl } } } : undefined);

async function main() {
  console.log('🌱 Seeding Sprint 0 Minimal Data...');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Tenant',
      slug: 'test-tenant',
      plan: 'cashier',
      status: 'active',
      timezone: 'Asia/Jakarta',
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Storage',
      location: 'Building A',
    },
  });

  const outlet = await prisma.outlet.create({
    data: {
      tenantId: tenant.id,
      name: 'Outlet Utama',
      address: 'Jl. Test No. 1',
      phone: '08123456789',
      defaultWarehouseId: warehouse.id,
    },
  });

  const now = new Date();
  const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await prisma.period.create({
    data: {
      tenantId: tenant.id,
      name: periodStr,
      startDate,
      endDate,
      status: 'OPEN',
    },
  });

  const prefixes = ['INV', 'PO', 'RCV', 'JRN'];
  for (const prefix of prefixes) {
    await prisma.numberSequence.create({
      data: {
        tenantId: tenant.id,
        prefix,
        year: String(now.getFullYear()),
        lastNumber: 0,
      },
    });
  }

  const unitKg = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      name: 'Kilogram',
      symbol: 'kg',
    },
  });

  const unitPcs = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      name: 'Piece',
      symbol: 'pcs',
    },
  });

  const accounts = [
    { code: '1001', name: 'Kas', type: 'ASSET', normalBalance: 'DEBIT' },
    { code: '4001', name: 'Pendapatan Penjualan', type: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '5001', name: 'Harga Pokok Penjualan', type: 'EXPENSE', normalBalance: 'DEBIT' },
    { code: '1002', name: 'Persediaan Barang', type: 'ASSET', normalBalance: 'DEBIT' },
    { code: '2001', name: 'Pajak Keluaran', type: 'LIABILITY', normalBalance: 'CREDIT' },
  ];

  for (const acc of accounts) {
    await prisma.account.create({
      data: {
        tenantId: tenant.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
      },
    });
  }

  const coffee = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'COF-001',
      name: 'Kopi Arabica',
      category: 'Bahan Baku',
      unitId: unitKg.id,
      price: 120000,
      status: 'ACTIVE',
    },
  });

  const cup = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'PKG-001',
      name: 'Gelas Paper',
      category: 'Packaging',
      unitId: unitPcs.id,
      price: 1200,
      status: 'ACTIVE',
    },
  });

  await prisma.inventoryBalance.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      itemId: coffee.id,
      currentStock: 10,
      averageCost: 100000,
      version: 0,
    },
  });

  await prisma.inventoryBalance.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      itemId: cup.id,
      currentStock: 200,
      averageCost: 1000,
      version: 0,
    },
  });

  await prisma.fifoLayer.create({
    data: {
      tenantId: tenant.id,
      itemId: coffee.id,
      warehouseId: warehouse.id,
      batchNumber: 'BATCH-INIT-01',
      quantity: 10,
      remainingQty: 10,
      unitCost: 100000,
      layerDate: new Date('2026-07-20'),
      isExhausted: false,
    },
  });

  await prisma.inventoryLedger.create({
    data: {
      tenantId: tenant.id,
      outletId: outlet.id,
      warehouseId: warehouse.id,
      itemId: coffee.id,
      movementType: 'OPENING',
      referenceType: 'OPENING',
      referenceId: 'OPEN-001',
      businessDate: new Date('2026-07-20'),
      qtyIn: 10,
      qtyOut: 0,
      balanceAfter: 10,
      unitCost: 100000,
      costMethod: 'FIFO',
      unitSnapshot: 'kg',
    },
  });

  const americano = await prisma.menu.create({
    data: {
      tenantId: tenant.id,
      name: 'Americano',
      price: 25000,
      category: 'Coffee',
      isActive: true,
    },
  });

  await prisma.recipe.create({
    data: {
      tenantId: tenant.id,
      menuId: americano.id,
      version: 1,
      effectiveFrom: new Date('2026-01-01'),
      effectiveUntil: null,
      details: {
        create: [
          { tenantId: tenant.id, itemId: coffee.id, quantity: 0.018, unitId: unitKg.id },
          { tenantId: tenant.id, itemId: cup.id, quantity: 1, unitId: unitPcs.id },
        ],
      },
    },
  });

  const pinHash = await bcrypt.hash('123456', 10);
  await prisma.userProfile.create({
    data: {
      userId: 'cashier-01',
      tenantId: tenant.id,
      role: 'cashier',
      fullName: 'Test Cashier',
      pinHash: pinHash,
      status: 'active',
      assignedOutlets: JSON.stringify([outlet.id]),
    },
  });

  console.log('✅ Sprint 0 Seed selesai!');
  console.log('📋 Tenant ID:', tenant.id);
  console.log('📋 Outlet ID:', outlet.id);
  console.log('📋 Menu ID (Americano):', americano.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
