import { prisma, withTenant, PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { Decimal } from "../utils/money.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";
import { reserveNumbers } from "./numbering.service.ts";

async function getBalanceForOutlet(
  db: typeof prisma | PrismaTransaction,
  tenantId: string,
  itemId: string,
  outletId: string,
) {
  const outlet = await db.outlet.findUnique({
    where: { id: outletId },
    select: { defaultWarehouseId: true },
  });

  return await db.inventoryBalance.findFirst({
    where: {
      tenantId,
      itemId,
      ...(outlet?.defaultWarehouseId
        ? { warehouseId: outlet.defaultWarehouseId }
        : {}),
    },
  });
}

export class StockOpnameService {
  async create(data: {
    tenantId: string;
    outletId: string;
    itemId: string;
    physicalStock: Decimal | number;
    estimatedUnitCost?: Decimal | number;
    notes?: string;
  }) {
    const physicalStockDec = new Decimal(data.physicalStock);

    const balance = await getBalanceForOutlet(
      prisma,
      data.tenantId,
      data.itemId,
      data.outletId,
    );

    const currentStockDec = balance
      ? new Decimal(balance.currentStock.toString())
      : new Decimal(0);
    const differenceDec = physicalStockDec.minus(currentStockDec);

    return await prisma.stockOpname.create({
      data: {
        tenantId: data.tenantId,
        outletId: data.outletId,
        itemId: data.itemId,
        systemStock: currentStockDec.toNumber(),
        physicalStock: physicalStockDec.toNumber(),
        difference: differenceDec.toNumber(),
        estimatedUnitCost: data.estimatedUnitCost
          ? new Decimal(data.estimatedUnitCost).toNumber()
          : null,
        notes: data.notes,
        status: "draft",
      },
    });
  }

  async confirm(opnameId: string, userId: string) {
    const opname = await prisma.stockOpname.findUnique({
      where: { id: opnameId },
      include: {
        tenant: true,
        item: { include: { unit: true } },
        outlet: { include: { defaultWarehouse: true } },
      },
    });

    if (!opname)
      throw new LedgerError("VAL-002", "Stock opname record not found");
    if (opname.status !== "draft")
      throw new LedgerError("SYS-001", "Opname already confirmed or cancelled");

    const diffDec = new Decimal(opname.difference.toString());
    if (diffDec.greaterThan(0) && !opname.estimatedUnitCost) {
      throw new LedgerError("VAL-005", "Surplus requires estimated unit cost");
    }

    const result = await withTenant(
      opname.tenantId,
      async (tx: PrismaTransaction) => {
        const balance = await getBalanceForOutlet(
          tx,
          opname.tenantId,
          opname.itemId,
          opname.outletId,
        );

        if (!balance)
          throw new LedgerError("INV-002", "Inventory balance not found");

        const engine = await CostEngineFactory.getEngine(opname.tenantId);

        if (!diffDec.isZero()) {
          const warehouseId = balance.warehouseId;
          if (diffDec.greaterThan(0)) {
            await engine.processPurchase(
              {
                itemId: opname.itemId,
                quantity: diffDec,
                unitCost: new Decimal(
                  opname.estimatedUnitCost
                    ? opname.estimatedUnitCost.toString()
                    : 0,
                ),
                warehouseId,
                purchaseOrderId: `OPNAME-${opname.id}`,
              },
              opname.tenantId,
              tx,
            );
          } else {
            await engine.adjustStock(
              {
                itemId: opname.itemId,
                quantity: diffDec,
                warehouseId,
                reason: `STOCK_OPNAME_${opname.id}`,
                unitCost: opname.estimatedUnitCost
                  ? new Decimal(opname.estimatedUnitCost.toString())
                  : undefined,
              },
              opname.tenantId,
              tx,
            );
          }
        }

        // Note: engine.adjustStock or engine.processPurchase already updated inventoryBalance atomically with optimistic lock.

        const costMethod =
          opname.tenant.plan === "cashier" ? "FIFO" : "AVERAGE";
        const diffNum = Number(opname.difference);

        await tx.inventoryLedger.create({
          data: {
            tenantId: opname.tenantId,
            outletId: opname.outletId,
            warehouseId: balance.warehouseId,
            itemId: opname.itemId,
            movementType: "STOCK_OPNAME",
            referenceType: "STOCK_OPNAME",
            referenceId: opname.id,
            businessDate: new Date(),
            qtyIn: diffNum > 0 ? diffNum : 0,
            qtyOut: diffNum < 0 ? Math.abs(diffNum) : 0,
            balanceAfter: Number(opname.physicalStock),
            unitCost: opname.estimatedUnitCost
              ? Number(opname.estimatedUnitCost)
              : 0,
            costMethod,
            unitSnapshot: opname.item.unit?.symbol || "pcs",
          },
        });

        // Double-entry journal entry for stock opname variance (§8.12)
        if (!diffDec.isZero()) {
          const unitCostVal = opname.estimatedUnitCost
            ? new Decimal(opname.estimatedUnitCost.toString())
            : balance.averageCost
            ? new Decimal(balance.averageCost.toString())
            : new Decimal(0);

          const totalAdjustmentValue = diffDec
            .abs()
            .times(unitCostVal)
            .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

          if (totalAdjustmentValue.gt(0)) {
            const year = new Date().getFullYear().toString();
            const [journalSeq] = await reserveNumbers(
              tx,
              opname.tenantId,
              "JRN",
              1,
            );
            const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

            const getOrCreateAccount = async (
              code: string,
              name: string,
              type: string,
              normalBalance: string,
            ) => {
              let acc = await tx.account.findUnique({
                where: { tenantId_code: { tenantId: opname.tenantId, code } },
              });
              if (!acc) {
                acc = await tx.account.create({
                  data: {
                    tenantId: opname.tenantId,
                    code,
                    name,
                    type,
                    normalBalance,
                  },
                });
              }
              return acc;
            };

            const inventoryAccount = await getOrCreateAccount(
              "PERSEDIAAN",
              "Persediaan Bahan Baku",
              "ASSET",
              "DEBIT",
            );

            let lines: { accountId: string; debit: number; credit: number }[] = [];
            const adjNum = totalAdjustmentValue.toNumber();

            if (diffDec.isNegative()) {
              // Loss/Shrinkage: Debit Beban Kerugian Persediaan, Credit Persediaan
              const lossAccount = await getOrCreateAccount(
                "BEBAN_KERUGIAN_PERSEDIAAN",
                "Beban Selisih / Kerugian Persediaan",
                "EXPENSE",
                "DEBIT",
              );
              lines = [
                { accountId: lossAccount.id, debit: adjNum, credit: 0 },
                { accountId: inventoryAccount.id, debit: 0, credit: adjNum },
              ];
            } else {
              // Surplus: Debit Persediaan, Credit Pendapatan Penyesuaian Persediaan
              const surplusAccount = await getOrCreateAccount(
                "PENYESUAIAN_PERSEDIAAN",
                "Pendapatan Penyesuaian Persediaan",
                "REVENUE",
                "CREDIT",
              );
              lines = [
                { accountId: inventoryAccount.id, debit: adjNum, credit: 0 },
                { accountId: surplusAccount.id, debit: 0, credit: adjNum },
              ];
            }

            await tx.journalEntry.create({
              data: {
                tenantId: opname.tenantId,
                entryNumber: journalNumber,
                entryDate: new Date(),
                referenceType: "STOCK_OPNAME",
                referenceId: opname.id,
                description: `Penyesuaian Nilai Stok Opname (${opname.item?.name || opname.itemId})`,
                status: "POSTED",
                lines: {
                  create: lines,
                },
              },
            });
          }
        }

        return tx.stockOpname.update({
          where: { id: opnameId },
          data: {
            status: "confirmed",
            confirmedBy: userId,
            confirmedAt: new Date(),
          },
        });
      },
    );

    return result;
  }

  async list(tenantId: string, status?: string) {
    return prisma.stockOpname.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        item: { select: { name: true, sku: true } },
        outlet: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export class WasteService {
  async create(data: {
    tenantId: string;
    outletId: string;
    itemId: string;
    quantity: Decimal | number;
    reason: string;
    createdBy: string;
  }) {
    const qtyDec = new Decimal(data.quantity);

    const balance = await getBalanceForOutlet(
      prisma,
      data.tenantId,
      data.itemId,
      data.outletId,
    );

    if (!balance) throw new LedgerError("INV-002", "Item inventory not found");

    const threshold = new Decimal(balance.currentStock.toString()).times(0.1);
    const needsApproval = qtyDec.greaterThan(threshold);

    const waste = await prisma.waste.create({
      data: {
        tenantId: data.tenantId,
        outletId: data.outletId,
        itemId: data.itemId,
        quantity: qtyDec.toNumber(),
        reason: data.reason,
        status: needsApproval ? "pending" : "approved",
        createdBy: data.createdBy,
        approvedBy: needsApproval ? null : data.createdBy,
        approvedAt: needsApproval ? null : new Date(),
      },
    });

    if (!needsApproval) {
      await this.approve(waste.id, data.createdBy);
    }

    return waste;
  }

  async approve(wasteId: string, userId: string) {
    const waste = await prisma.waste.findUnique({
      where: { id: wasteId },
      include: {
        tenant: true,
        item: { include: { unit: true } },
        outlet: true,
      },
    });

    if (!waste) throw new LedgerError("VAL-002", "Waste record not found");
    if (waste.status !== "pending")
      throw new LedgerError("SYS-001", "Waste already processed");

    const result = await withTenant(
      waste.tenantId,
      async (tx: PrismaTransaction) => {
        const balance = await getBalanceForOutlet(
          tx,
          waste.tenantId,
          waste.itemId,
          waste.outletId,
        );

        if (!balance) throw new LedgerError("INV-002", "Balance not found");

        const engine = await CostEngineFactory.getEngine(waste.tenantId);
        const qtyDec = new Decimal(waste.quantity.toString());
        const diffDec = qtyDec.negated();

        await engine.adjustStock(
          {
            itemId: waste.itemId,
            quantity: diffDec,
            warehouseId: balance.warehouseId,
            reason: `WASTE_${waste.id}`,
            unitCost: new Decimal(0),
          },
          waste.tenantId,
          tx,
        );

        const newStock = new Decimal(balance.currentStock.toString()).minus(
          qtyDec,
        );
        const oldVersion = balance.version;

        const updated = await tx.inventoryBalance.updateMany({
          where: { id: balance.id, version: oldVersion },
          data: {
            currentStock: newStock.toNumber(),
            version: { increment: 1 },
            lastUpdated: new Date(),
          },
        });

        if (updated.count === 0) {
          throw new LedgerError(
            "LOCK-001",
            "Optimistic locking conflict on waste processing",
          );
        }

        const costMethod = waste.tenant.plan === "cashier" ? "FIFO" : "AVERAGE";

        await tx.inventoryLedger.create({
          data: {
            tenantId: waste.tenantId,
            outletId: waste.outletId,
            warehouseId: balance.warehouseId,
            itemId: waste.itemId,
            movementType: "WASTE",
            referenceType: "WASTE",
            referenceId: waste.id,
            businessDate: new Date(),
            qtyIn: 0,
            qtyOut: Number(waste.quantity),
            balanceAfter: newStock.toNumber(),
            unitCost: 0,
            costMethod,
            unitSnapshot: waste.item.unit?.symbol || "pcs",
          },
        });

        return tx.waste.update({
          where: { id: wasteId },
          data: {
            status: "approved",
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });
      },
    );

    return result;
  }

  async list(tenantId: string, status?: string) {
    return prisma.waste.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        item: { select: { name: true, sku: true } },
        outlet: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
