import { PrismaTransaction, prisma } from "../../lib/prisma.ts";
import { Decimal } from "decimal.js";
import {
  ICostEngine,
  IAllocateCostResult,
  IPurchaseCostResult,
  IAllocationItem,
} from "./ICostEngine.ts";
import { LedgerError } from "../../utils/errorCodes.ts";

export class AverageCostEngine implements ICostEngine {
  async getCurrentUnitCost(
    itemId: string,
    tenantId: string,
    warehouseId: string,
  ): Promise<Decimal> {
    const balance = await prisma.inventoryBalance.findUnique({
      where: {
        tenantId_itemId_warehouseId: {
          tenantId: tenantId,
          itemId: itemId,
          warehouseId: warehouseId,
        },
      },
    });
    return new Decimal(balance?.averageCost?.toString() || 0);
  }

  async allocateSalesCost(
    allocations: IAllocationItem[],
    salesId: string,
    tenantId: string,
    outletId: string,
    tx?: PrismaTransaction,
  ): Promise<IAllocateCostResult> {
    const transaction = tx || prisma;
    const result: IAllocateCostResult = { totalHpp: new Decimal(0), items: [] };

    const itemIds = allocations.map((a) => a.itemId);
    const uniqueItemIds = [...new Set(itemIds)];
    const balances = await transaction.inventoryBalance.findMany({
      where: {
        tenantId: tenantId,
        itemId: { in: uniqueItemIds },
        warehouseId: { in: allocations.map((a) => a.warehouseId) },
      },
    });

    const balanceMap = new Map<string, Decimal>();
    for (const b of balances) {
      const key = `${b.itemId}|${b.warehouseId}`;
      balanceMap.set(key, new Decimal(b.averageCost?.toString() || 0));
    }

    const detailMap = new Map<
      string,
      { itemId: string; quantity: Decimal; warehouseId: string }[]
    >();
    for (const alloc of allocations) {
      if (!detailMap.has(alloc.salesDetailId)) {
        detailMap.set(alloc.salesDetailId, []);
      }
      detailMap.get(alloc.salesDetailId)!.push({
        itemId: alloc.itemId,
        quantity: alloc.quantity,
        warehouseId: alloc.warehouseId,
      });
    }

    for (const [salesDetailId, allocs] of detailMap) {
      let totalCost = new Decimal(0);
      const detailItems: {
        itemId: string;
        quantity: Decimal;
        unitCost: Decimal;
        totalCost: Decimal;
      }[] = [];

      for (const alloc of allocs) {
        const key = `${alloc.itemId}|${alloc.warehouseId}`;
        let avgCost = balanceMap.get(key);

        if (!avgCost || avgCost.isZero()) {
          const item = await transaction.item.findUnique({
            where: { id: alloc.itemId },
          });
          if (item && item.price && Number(item.price) > 0) {
            avgCost = new Decimal(item.price.toString());
          } else {
            const lastReceiving = await transaction.receivingDetail.findFirst({
              where: { itemId: alloc.itemId, receiving: { tenantId } },
              orderBy: { createdAt: "desc" },
            });
            if (lastReceiving && Number(lastReceiving.unitCost) > 0) {
              avgCost = new Decimal(lastReceiving.unitCost.toString());
            } else {
              throw new LedgerError(
                "COST_001",
                `Missing cost: cannot determine average cost for item ${alloc.itemId}. Zero cost is prohibited.`,
              );
            }
          }
        }

        const cost = avgCost.times(alloc.quantity);
        totalCost = totalCost.plus(cost);

        detailItems.push({
          itemId: alloc.itemId,
          quantity: alloc.quantity,
          unitCost: avgCost,
          totalCost: cost,
        });
      }

      await transaction.salesDetail.update({
        where: { id: salesDetailId },
        data: {
          hpp: totalCost.toNumber(),
          hppStatus: "ALLOCATED",
        },
      });

      result.totalHpp = result.totalHpp.plus(totalCost);
      for (const di of detailItems) {
        result.items.push({
          itemId: di.itemId,
          quantity: di.quantity,
          unitCost: di.unitCost,
          totalCost: di.totalCost,
          salesDetailId,
        });
      }
    }

    return result;
  }

  async processPurchase(
    purchase: {
      itemId: string;
      quantity: Decimal;
      unitCost: Decimal;
      warehouseId: string;
      purchaseOrderId: string;
    },
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<IPurchaseCostResult> {
    const transaction = tx || prisma;

    const balance = await transaction.inventoryBalance.findUnique({
      where: {
        tenantId_itemId_warehouseId: {
          tenantId: tenantId,
          itemId: purchase.itemId,
          warehouseId: purchase.warehouseId,
        },
      },
    });

    if (!balance) {
      await transaction.inventoryBalance.create({
        data: {
          tenantId: tenantId,
          itemId: purchase.itemId,
          warehouseId: purchase.warehouseId,
          currentStock: purchase.quantity.toNumber(),
          averageCost: purchase.unitCost.toNumber(),
          version: 0,
          lastUpdated: new Date(),
        },
      });
      return { newAverageCost: purchase.unitCost, fifoLayersUpdated: 0 };
    }

    const currentStock = new Decimal(balance.currentStock.toString());
    const currentAvg = new Decimal(balance.averageCost?.toString() || 0);
    const newStock = currentStock.plus(purchase.quantity);
    const newAvg = newStock.greaterThan(0)
      ? currentStock
          .times(currentAvg)
          .plus(purchase.quantity.times(purchase.unitCost))
          .dividedBy(newStock)
      : purchase.unitCost;

    const oldVersion = balance.version;
    const updated = await transaction.inventoryBalance.updateMany({
      where: { id: balance.id, version: oldVersion },
      data: {
        currentStock: newStock.toNumber(),
        averageCost: newAvg.toNumber(),
        version: { increment: 1 },
        lastUpdated: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new LedgerError(
        "LOCK_001",
        "Optimistic locking conflict on Average Cost update",
      );
    }

    return { newAverageCost: newAvg, fifoLayersUpdated: 0 };
  }

  async rollbackSalesAllocation(
    salesId: string,
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<void> {
    const transaction = tx || prisma;
    const details = await transaction.salesDetail.findMany({
      where: { salesId },
      include: {
        sales: {
          include: { outlet: true },
        },
      },
    });

    for (const detail of details) {
      const rawSnapshot = detail.recipeSnapshot as any;
      const snapshot = typeof rawSnapshot === "string" ? JSON.parse(rawSnapshot) : rawSnapshot;
      if (!snapshot || !snapshot.finalItems) continue;

      // ============================================================
      // FIX: Gunakan warehouseId dari transaksi asli (ADR-079)
      // ============================================================
      const warehouseId = (detail.sales as any).warehouseId;
      const finalWarehouseId =
        warehouseId ?? detail.sales.outlet.defaultWarehouseId;
      if (!finalWarehouseId) continue;

      for (const item of snapshot.finalItems) {
        const quantity = new Decimal(item.quantity).times(
          detail.quantity.toString(),
        );
        const balance = await transaction.inventoryBalance.findUnique({
          where: {
            tenantId_itemId_warehouseId: {
              tenantId: tenantId,
              itemId: item.itemId,
              warehouseId: finalWarehouseId,
            },
          },
        });

        if (balance) {
          const oldVersion = balance.version;
          const updated = await transaction.inventoryBalance.updateMany({
            where: { id: balance.id, version: oldVersion },
            data: {
              currentStock: new Decimal(balance.currentStock.toString())
                .plus(quantity)
                .toNumber(),
              version: { increment: 1 },
              lastUpdated: new Date(),
            },
          });

          if (updated.count === 0) {
            throw new LedgerError(
              "LOCK_001",
              "Optimistic locking conflict on rollback",
            );
          }
        }
      }
    }
  }

  async adjustStock(
    adjustment: {
      itemId: string;
      quantity: Decimal;
      warehouseId: string;
      reason: string;
      unitCost?: Decimal;
    },
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<void> {
    const transaction = tx || prisma;

    const balance = await transaction.inventoryBalance.findUnique({
      where: {
        tenantId_itemId_warehouseId: {
          tenantId: tenantId,
          itemId: adjustment.itemId,
          warehouseId: adjustment.warehouseId,
        },
      },
    });

    if (!balance) throw new LedgerError("INV_002", "Item not found");

    const newStock = new Decimal(balance.currentStock.toString()).plus(
      adjustment.quantity,
    );
    const currentAvg = new Decimal(balance.averageCost?.toString() || 0);
    let newAvg = currentAvg;

    if (adjustment.unitCost) {
      const totalCost = new Decimal(balance.currentStock.toString())
        .times(currentAvg)
        .plus(adjustment.quantity.times(adjustment.unitCost));
      newAvg = newStock.greaterThan(0)
        ? totalCost.dividedBy(newStock)
        : currentAvg;
    }

    const oldVersion = balance.version;
    const updated = await transaction.inventoryBalance.updateMany({
      where: { id: balance.id, version: oldVersion },
      data: {
        currentStock: newStock.toNumber(),
        averageCost: newAvg.toNumber(),
        version: { increment: 1 },
        lastUpdated: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new LedgerError(
        "LOCK_001",
        "Optimistic locking conflict on Average Cost adjust",
      );
    }

    await transaction.inventoryLedger.create({
      data: {
        tenantId: tenantId,
        outletId: "",
        warehouseId: adjustment.warehouseId,
        itemId: adjustment.itemId,
        movementType: adjustment.reason.startsWith("REFUND")
          ? "REFUND"
          : "STOCK_ADJUSTMENT",
        referenceType: "ADJUSTMENT",
        referenceId: adjustment.reason,
        businessDate: new Date(),
        qtyIn: adjustment.quantity.greaterThan(0)
          ? adjustment.quantity.toNumber()
          : 0,
        qtyOut: adjustment.quantity.lessThan(0)
          ? Math.abs(adjustment.quantity.toNumber())
          : 0,
        balanceAfter: newStock.toNumber(),
        unitCost: adjustment.unitCost ? adjustment.unitCost.toNumber() : 0,
        costMethod: "AVERAGE",
        unitSnapshot: "pcs",
      },
    });
  }
}
