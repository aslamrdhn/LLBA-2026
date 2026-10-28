import { PrismaTransaction, prisma } from "../../lib/prisma.ts";
import { Decimal } from "decimal.js";
import {
  ICostEngine,
  IAllocateCostResult,
  IPurchaseCostResult,
  IAllocationItem,
} from "./ICostEngine.ts";
import { LedgerError } from "../../utils/errorCodes.ts";

const PRECISION = new Decimal(1e-6);

export class FifoCostEngine implements ICostEngine {
  async getCurrentUnitCost(
    itemId: string,
    tenantId: string,
    warehouseId: string,
  ): Promise<Decimal> {
    const layer = await prisma.fifoLayer.findFirst({
      where: {
        tenantId: tenantId,
        itemId: itemId,
        warehouseId: warehouseId,
        remainingQty: { gt: 0 },
        isExhausted: false,
      },
      orderBy: [{ isVirtual: "asc" }, { layerDate: "asc" }],
    });

    if (!layer) return new Decimal(0);
    return new Decimal(layer.unitCost.toString());
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
    const warehouses = allocations.map((a) => a.warehouseId);
    const uniqueWarehouses = [...new Set(warehouses)];

    const layers = await transaction.fifoLayer.findMany({
      where: {
        tenantId: tenantId,
        itemId: { in: uniqueItemIds },
        warehouseId: { in: uniqueWarehouses },
        remainingQty: { gt: 0 },
        isExhausted: false,
      },
      orderBy: [{ isVirtual: "asc" }, { layerDate: "asc" }],
    });

    const layerMap = new Map<string, typeof layers>();
    for (const layer of layers) {
      const key = `${layer.itemId}|${layer.warehouseId}`;
      if (!layerMap.has(key)) layerMap.set(key, []);
      layerMap.get(key)!.push(layer);
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
        let remainingToConsume = alloc.quantity;
        let allocatedCost = new Decimal(0);

        while (remainingToConsume.greaterThan(0)) {
          const key = `${alloc.itemId}|${alloc.warehouseId}`;
          const availableLayers = layerMap.get(key) || [];
          let layer = availableLayers.find((l) =>
            new Decimal(l.remainingQty.toString()).greaterThan(0),
          );

          if (!layer) {
            const lastCost = await this.getLastKnownUnitCost(
              transaction,
              tenantId,
              alloc.itemId,
            );
            await this.createVirtualLayer(
              transaction,
              tenantId,
              alloc.itemId,
              alloc.warehouseId,
              remainingToConsume,
              lastCost,
            );

            const newLayer = await transaction.fifoLayer.findFirst({
              where: {
                tenantId: tenantId,
                itemId: alloc.itemId,
                warehouseId: alloc.warehouseId,
                remainingQty: { gt: 0 },
                isExhausted: false,
              },
              orderBy: [{ isVirtual: "asc" }, { layerDate: "asc" }],
            });

            if (!newLayer)
              throw new LedgerError(
                "INV_003",
                `FIFO layer not found for item ${alloc.itemId}`,
              );
            layer = newLayer;
            if (!layerMap.has(key)) layerMap.set(key, []);
            layerMap.get(key)!.push(layer);
          }

          const remaining = new Decimal(layer.remainingQty.toString());
          const consumeQty = Decimal.min(remainingToConsume, remaining);
          const oldVersion = layer.version;
          const newRemaining = remaining.minus(consumeQty);
          const isExhausted = newRemaining.lessThan(PRECISION);

          const updated = await transaction.fifoLayer.updateMany({
            where: { id: layer.id, version: oldVersion },
            data: {
              remainingQty: newRemaining.toNumber(),
              isExhausted: isExhausted,
              version: { increment: 1 },
              lastUpdated: new Date(),
            },
          });

          if (updated.count === 0) {
            throw new LedgerError(
              "LOCK_001",
              `FIFO layer ${layer.id} conflict`,
            );
          }

          // ============================================================
          // FIX: Memory Sync Fix - update memory state after DB update
          // ============================================================
          (layer as any).remainingQty = newRemaining.toNumber();
          layer.version = layer.version + 1;
          layer.isExhausted = isExhausted;

          const cost = new Decimal(layer.unitCost.toString()).times(consumeQty);
          allocatedCost = allocatedCost.plus(cost);
          remainingToConsume = remainingToConsume.minus(consumeQty);

          await transaction.fifoConsumption.create({
            data: {
              tenantId: tenantId,
              layerId: layer.id,
              itemId: alloc.itemId,
              salesId: salesId,
              quantityConsumed: consumeQty.toNumber(),
              unitCostAtTime: Number(layer.unitCost),
              consumptionDate: new Date(),
            },
          });
        }

        const unitCost = alloc.quantity.greaterThan(0)
          ? allocatedCost.dividedBy(alloc.quantity)
          : new Decimal(0);
        totalCost = totalCost.plus(allocatedCost);
        detailItems.push({
          itemId: alloc.itemId,
          quantity: alloc.quantity,
          unitCost: unitCost,
          totalCost: allocatedCost,
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
          salesDetailId: salesDetailId,
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

    await transaction.fifoLayer.create({
      data: {
        tenantId: tenantId,
        itemId: purchase.itemId,
        warehouseId: purchase.warehouseId,
        batchNumber: `PO-${purchase.purchaseOrderId}-${Date.now()}`,
        quantity: purchase.quantity.toNumber(),
        remainingQty: purchase.quantity.toNumber(),
        unitCost: purchase.unitCost.toNumber(),
        layerDate: new Date(),
        isExhausted: false,
        isVirtual: false,
        version: 0,
        lastUpdated: new Date(),
      },
    });

    const balance = await transaction.inventoryBalance.findUnique({
      where: {
        tenantId_itemId_warehouseId: {
          tenantId: tenantId,
          itemId: purchase.itemId,
          warehouseId: purchase.warehouseId,
        },
      },
    });

    if (balance) {
      const oldVersion = balance.version;
      const updated = await transaction.inventoryBalance.updateMany({
        where: { id: balance.id, version: oldVersion },
        data: {
          currentStock: new Decimal(balance.currentStock.toString())
            .plus(purchase.quantity)
            .toNumber(),
          version: { increment: 1 },
          lastUpdated: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new LedgerError(
          "LOCK_001",
          "Optimistic locking conflict on purchase",
        );
      }
    } else {
      await transaction.inventoryBalance.create({
        data: {
          tenantId: tenantId,
          itemId: purchase.itemId,
          warehouseId: purchase.warehouseId,
          currentStock: purchase.quantity.toNumber(),
          averageCost: 0,
          version: 0,
          lastUpdated: new Date(),
        },
      });
    }

    return { newAverageCost: new Decimal(0), fifoLayersUpdated: 1 };
  }

  async rollbackSalesAllocation(
    salesId: string,
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<void> {
    const transaction = tx || prisma;
    const consumptions = await transaction.fifoConsumption.findMany({
      where: { salesId: salesId },
      include: { layer: true },
    });

    for (const consumption of consumptions) {
      const layer = consumption.layer;
      if (!layer) continue;

      const oldVersion = layer.version;
      const newRemaining = new Decimal(layer.remainingQty.toString()).plus(
        consumption.quantityConsumed.toString(),
      );

      const updated = await transaction.fifoLayer.updateMany({
        where: { id: layer.id, version: oldVersion },
        data: {
          remainingQty: newRemaining.toNumber(),
          isExhausted: false,
          version: { increment: 1 },
          lastUpdated: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new LedgerError(
          "LOCK_001",
          `FIFO layer ${layer.id} conflict on rollback`,
        );
      }

      // Update memory state for rollback
      (layer as any).remainingQty = newRemaining.toNumber();
      layer.version = layer.version + 1;
      layer.isExhausted = false;

      const balance = await transaction.inventoryBalance.findUnique({
        where: {
          tenantId_itemId_warehouseId: {
            tenantId: tenantId,
            itemId: consumption.itemId,
            warehouseId: layer.warehouseId,
          },
        },
      });

      if (balance) {
        const oldBalVersion = balance.version;
        const balUpdated = await transaction.inventoryBalance.updateMany({
          where: { id: balance.id, version: oldBalVersion },
          data: {
            currentStock: new Decimal(balance.currentStock.toString())
              .plus(consumption.quantityConsumed.toString())
              .toNumber(),
            version: { increment: 1 },
            lastUpdated: new Date(),
          },
        });

        if (balUpdated.count === 0) {
          throw new LedgerError(
            "LOCK_001",
            "Optimistic locking conflict on rollback balance",
          );
        }

        balance.version = balance.version + 1;
        (balance as any).currentStock = new Decimal(
          balance.currentStock.toString(),
        )
          .plus(consumption.quantityConsumed.toString())
          .toNumber();
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

    // ============================================================
    // FIX: Zero Cost Fix (ADR-078)
    // ============================================================
    let unitCost: Decimal;
    if (adjustment.unitCost) {
      unitCost = adjustment.unitCost;
    } else if (adjustment.quantity.greaterThan(0)) {
      // Surplus: search last known cost or average cost
      const lastCost = await this.getLastKnownUnitCost(
        transaction,
        tenantId,
        adjustment.itemId,
      );
      if (lastCost && lastCost.greaterThan(0)) {
        unitCost = lastCost;
      } else if (
        balance.averageCost &&
        new Decimal(balance.averageCost.toString()).greaterThan(0)
      ) {
        unitCost = new Decimal(balance.averageCost.toString());
      } else {
        throw new LedgerError(
          "OPN_002",
          "Surplus requires estimated unit cost or existing cost reference",
        );
      }
    } else {
      // Deficit
      unitCost = new Decimal(0);
    }

    const oldVersion = balance.version;
    const updated = await transaction.inventoryBalance.updateMany({
      where: { id: balance.id, version: oldVersion },
      data: {
        currentStock: new Decimal(balance.currentStock.toString())
          .plus(adjustment.quantity)
          .toNumber(),
        version: { increment: 1 },
        lastUpdated: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new LedgerError(
        "LOCK_001",
        "Optimistic locking conflict on adjustStock",
      );
    }

    balance.version = balance.version + 1;
    (balance as any).currentStock = new Decimal(balance.currentStock.toString())
      .plus(adjustment.quantity)
      .toNumber();

    await transaction.fifoLayer.create({
      data: {
        tenantId: tenantId,
        itemId: adjustment.itemId,
        warehouseId: adjustment.warehouseId,
        batchNumber: `ADJ-${Date.now()}`,
        quantity: adjustment.quantity.toNumber(),
        remainingQty: adjustment.quantity.toNumber(),
        unitCost: unitCost.toNumber(),
        layerDate: new Date(),
        isExhausted: false,
        isVirtual: true,
        virtualCost: unitCost.toNumber(),
        version: 0,
        lastUpdated: new Date(),
      },
    });

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
        balanceAfter: new Decimal(balance.currentStock.toString())
          .plus(adjustment.quantity)
          .toNumber(),
        unitCost: unitCost.toNumber(),
        costMethod: "FIFO",
        unitSnapshot: "pcs",
      },
    });
  }

  private async getLastKnownUnitCost(
    tx: PrismaTransaction,
    tenantId: string,
    itemId: string,
  ): Promise<Decimal> {
    const lastLayer = await tx.fifoLayer.findFirst({
      where: {
        tenantId: tenantId,
        itemId: itemId,
        isVirtual: false,
        unitCost: { gt: 0 },
      },
      orderBy: { layerDate: "desc" },
    });

    if (lastLayer) return new Decimal(lastLayer.unitCost.toString());

    const lastReceiving = await tx.receivingDetail.findFirst({
      where: { itemId: itemId, receiving: { tenantId: tenantId } },
      orderBy: { createdAt: "desc" },
    });

    if (lastReceiving && Number(lastReceiving.unitCost) > 0) {
      return new Decimal(lastReceiving.unitCost.toString());
    }

    const item = await tx.item.findUnique({
      where: { id: itemId },
    });

    if (item && item.price && Number(item.price) > 0) {
      return new Decimal(item.price.toString());
    }

    throw new LedgerError(
      "COST_001",
      `Missing cost layer: cannot determine unit cost for item ${itemId}. Zero cost is prohibited.`,
    );
  }

  private async createVirtualLayer(
    tx: PrismaTransaction,
    tenantId: string,
    itemId: string,
    warehouseId: string,
    quantity: Decimal,
    unitCost: Decimal,
  ): Promise<void> {
    await tx.fifoLayer.create({
      data: {
        tenantId: tenantId,
        itemId: itemId,
        warehouseId: warehouseId,
        batchNumber: `VIRTUAL-${Date.now()}`,
        quantity: quantity.toNumber(),
        remainingQty: quantity.toNumber(),
        unitCost: unitCost.toNumber(),
        layerDate: new Date(),
        isExhausted: false,
        isVirtual: true,
        virtualCost: unitCost.toNumber(),
        version: 0,
        lastUpdated: new Date(),
      },
    });
  }
}
