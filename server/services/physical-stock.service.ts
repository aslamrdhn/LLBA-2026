import { PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { Decimal } from "../utils/money.ts";

export interface StockMutationParams {
  tenantId: string;
  warehouseId: string;
  itemId: string;
  quantity: Decimal | number;
  reason: string;
  referenceId?: string;
  forceStock?: boolean;
}

export class PhysicalStockService {
  /**
   * BIZ-010: Cek apakah ada stock opname aktif (status draft / in_progress)
   * pada outlet/gudang yang bersangkutan.
   * Jika ada, transaksi mutasi atau checkout pada gudang tersebut DITOLAK.
   */
  static async checkOpnamePending(
    tx: PrismaTransaction,
    params: {
      tenantId: string;
      outletId?: string;
      warehouseId?: string;
      itemIds?: string[];
      itemId?: string;
    }
  ): Promise<void> {
    const whereClause: any = {
      tenantId: params.tenantId,
      status: {
        in: ["draft", "in_progress", "DRAFT", "IN_PROGRESS", "OPEN"],
      },
    };

    if (params.outletId) {
      whereClause.outletId = params.outletId;
    }

    if (params.itemIds && params.itemIds.length > 0) {
      whereClause.itemId = { in: params.itemIds };
    } else if (params.itemId) {
      whereClause.itemId = params.itemId;
    }

    const activeOpname = await tx.stockOpname.findFirst({
      where: whereClause,
      select: { id: true, itemId: true },
    });

    if (activeOpname) {
      throw new LedgerError(
        "BIZ-010",
        `Bahan baku (ID: ${activeOpname.itemId}) sedang dalam proses Stock Opname aktif (Opname ID: ${activeOpname.id}). Penjualan menu yang menggunakan bahan ini ditolak sampai opname diselesaikan.`
      );
    }
  }

  /**
   * Mengurangi stok fisik secara atomik dengan row-level lock (FOR UPDATE).
   * Menjamin prinsip 'Satu Realitas Fisik' — hanya PhysicalStockService yang mengubah kuantitas.
   */
  static async deductStock(
    tx: PrismaTransaction,
    params: StockMutationParams
  ): Promise<{ itemId: string; warehouseId: string; newStock: Decimal }> {
    const qtyToDeduct = new Decimal(params.quantity.toString());

    if (qtyToDeduct.isNegative() || qtyToDeduct.isZero()) {
      throw new LedgerError("VAL-001", "Kuantitas pengurangan stok harus bernilai positif");
    }

    // Pessimistic lock row-level pada database PostgreSQL
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("postgres")) {
      await tx.$executeRaw`
        SELECT 1 FROM "inventory_balance" 
        WHERE "tenant_id" = ${params.tenantId} 
          AND "warehouse_id" = ${params.warehouseId} 
          AND "item_id" = ${params.itemId}
        FOR UPDATE
      `;
    }

    const balance = await tx.inventoryBalance.findFirst({
      where: {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        itemId: params.itemId,
      },
    });

    if (!balance) {
      if (params.forceStock) {
        // Mode darurat / migrasi: buat balance record baru dengan stok minus/nol
        const created = await tx.inventoryBalance.create({
          data: {
            tenantId: params.tenantId,
            warehouseId: params.warehouseId,
            itemId: params.itemId,
            currentStock: qtyToDeduct.negated().toNumber(),
            averageCost: 0,
            version: 1,
          },
        });
        return {
          itemId: params.itemId,
          warehouseId: params.warehouseId,
          newStock: new Decimal(created.currentStock.toString()),
        };
      }
      throw new LedgerError(
        "INV_001",
        `Data saldo persediaan tidak ditemukan untuk item ${params.itemId} di gudang ${params.warehouseId}`
      );
    }

    const currentStockDec = new Decimal(balance.currentStock.toString());
    const nextStock = currentStockDec.minus(qtyToDeduct);

    if (nextStock.isNegative() && !params.forceStock) {
      throw new LedgerError(
        "INV_001",
        `Stok fisik tidak mencukupi untuk item ${params.itemId}. Stok saat ini: ${currentStockDec.toString()}, dibutuhkan: ${qtyToDeduct.toString()}`
      );
    }

    const updated = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        currentStock: nextStock.toNumber(),
        version: { increment: 1 },
        lastUpdated: new Date(),
      },
    });

    return {
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      newStock: new Decimal(updated.currentStock.toString()),
    };
  }

  /**
   * Menambah stok fisik (misalnya saat Receiving atau Void/Pembatalan Penjualan).
   */
  static async addStock(
    tx: PrismaTransaction,
    params: StockMutationParams
  ): Promise<{ itemId: string; warehouseId: string; newStock: Decimal }> {
    const qtyToAdd = new Decimal(params.quantity.toString());

    if (qtyToAdd.isNegative() || qtyToAdd.isZero()) {
      throw new LedgerError("VAL-001", "Kuantitas penambahan stok harus bernilai positif");
    }

    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("postgres")) {
      await tx.$executeRaw`
        SELECT 1 FROM "inventory_balance" 
        WHERE "tenant_id" = ${params.tenantId} 
          AND "warehouse_id" = ${params.warehouseId} 
          AND "item_id" = ${params.itemId}
        FOR UPDATE
      `;
    }

    const balance = await tx.inventoryBalance.findFirst({
      where: {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        itemId: params.itemId,
      },
    });

    if (!balance) {
      const created = await tx.inventoryBalance.create({
        data: {
          tenantId: params.tenantId,
          warehouseId: params.warehouseId,
          itemId: params.itemId,
          currentStock: qtyToAdd.toNumber(),
          averageCost: 0,
          version: 1,
        },
      });
      return {
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        newStock: new Decimal(created.currentStock.toString()),
      };
    }

    const currentStockDec = new Decimal(balance.currentStock.toString());
    const nextStock = currentStockDec.plus(qtyToAdd);

    const updated = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        currentStock: nextStock.toNumber(),
        version: { increment: 1 },
        lastUpdated: new Date(),
      },
    });

    return {
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      newStock: new Decimal(updated.currentStock.toString()),
    };
  }
}
