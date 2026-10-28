import { prisma, withTenant, PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { Decimal } from "../utils/money.ts";
import { reserveNumbers } from "./numbering.service.ts";
import { PhysicalStockService } from "./physical-stock.service.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";

/**
 * Sanitizes CSV cell input to prevent CSV / Formula Injection (CWE-1236).
 * Prepend single quote if cell starts with dangerous formula trigger characters.
 */
export function sanitizeCsvFormula(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const rawStr = String(value);
  if (/^[=+\-@\t\r]/.test(rawStr)) {
    return "'" + rawStr;
  }
  const str = rawStr.trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

export interface OpeningBalanceItemInput {
  sku: string;
  name: string;
  unitSymbol: string;
  category?: string;
  quantity: number;
  unitCost: number;
}

export interface OpeningBalanceParams {
  tenantId: string;
  warehouseId: string;
  items: OpeningBalanceItemInput[];
  openingDate?: Date;
  notes?: string;
}

export class MigrationService {
  /**
   * Import Opening Balances with formula sanitization and double-entry equity posting (§8.17)
   */
  static async importOpeningBalance(params: OpeningBalanceParams): Promise<{
    importedCount: number;
    totalOpeningValue: Decimal;
    journalNumber: string;
  }> {
    const { tenantId, warehouseId, items, openingDate = new Date(), notes } = params;

    if (!items || items.length === 0) {
      throw new LedgerError("VAL-001", "Daftar saldo awal persediaan tidak boleh kosong.");
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
      include: { Outlet: true },
    });
    if (!warehouse) {
      throw new LedgerError("VAL-003", "Gudang saldo awal tidak ditemukan pada tenant ini.");
    }

    return withTenant(tenantId, async (tx: PrismaTransaction) => {
      let totalOpeningValue = new Decimal(0);
      let importedCount = 0;

      const engine = await CostEngineFactory.getEngine(tenantId);

      for (const rawItem of items) {
        const sku = sanitizeCsvFormula(rawItem.sku);
        const name = sanitizeCsvFormula(rawItem.name);
        const unitSymbol = sanitizeCsvFormula(rawItem.unitSymbol).toLowerCase() || "pcs";
        const quantity = new Decimal(rawItem.quantity);
        const unitCost = new Decimal(rawItem.unitCost);

        if (quantity.isNegative()) {
          throw new LedgerError(
            "VAL-001",
            `Kuantitas awal untuk ${name} tidak boleh negatif: ${quantity.toString()}`,
          );
        }

        if (unitCost.isNegative() || unitCost.isZero()) {
          throw new LedgerError(
            "VAL-001",
            `Biaya satuan awal untuk ${name} harus lebih besar dari 0 (True Cost melarang biaya nol): ${unitCost.toString()}`,
          );
        }

        // 1. Get or create Unit
        let unit = await tx.unit.findFirst({
          where: { tenantId, symbol: unitSymbol },
        });
        if (!unit) {
          unit = await tx.unit.create({
            data: {
              tenantId,
              name: unitSymbol.toUpperCase(),
              symbol: unitSymbol,
            },
          });
        }

        // 2. Get or create Item
        let item = await tx.item.findFirst({
          where: { tenantId, sku },
        });
        if (!item) {
          item = await tx.item.create({
            data: {
              tenantId,
              sku,
              name,
              category: rawItem.category || "RAW_MATERIAL",
              unitId: unit.id,
              price: unitCost.toNumber(),
              status: "ACTIVE",
            },
          });
        }

        const lineTotal = quantity.times(unitCost).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
        totalOpeningValue = totalOpeningValue.plus(lineTotal);

        // 3. Update physical stock and balance
        const balance = await tx.inventoryBalance.findFirst({
          where: { tenantId, itemId: item.id, warehouseId },
        });

        if (balance) {
          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: {
              currentStock: quantity.toNumber(),
              averageCost: unitCost.toNumber(),
              lastUpdated: openingDate,
            },
          });
        } else {
          await tx.inventoryBalance.create({
            data: {
              tenantId,
              itemId: item.id,
              warehouseId,
              currentStock: quantity.toNumber(),
              averageCost: unitCost.toNumber(),
              version: 0,
              lastUpdated: openingDate,
            },
          });
        }

        // 4. Create initial FifoLayer
        await tx.fifoLayer.create({
          data: {
            tenantId,
            itemId: item.id,
            warehouseId,
            batchNumber: `OPENING-BAL-${item.sku}`,
            quantity: quantity.toNumber(),
            remainingQty: quantity.toNumber(),
            unitCost: unitCost.toNumber(),
            layerDate: openingDate,
            isExhausted: quantity.isZero(),
            isVirtual: false,
          },
        });

        // 5. Append-only inventory ledger
        await tx.inventoryLedger.create({
          data: {
            tenantId,
            outletId: warehouse.Outlet?.[0]?.id || warehouseId,
            warehouseId,
            itemId: item.id,
            movementType: "OPENING_BALANCE",
            referenceType: "MIGRATION",
            referenceId: `OPENING-${tenantId}`,
            businessDate: openingDate,
            qtyIn: quantity.toNumber(),
            qtyOut: 0,
            balanceAfter: quantity.toNumber(),
            unitCost: unitCost.toNumber(),
            costMethod: "FIFO/AVERAGE",
            unitSnapshot: unitSymbol,
          },
        });

        importedCount++;
      }

      // 6. Double-Entry General Ledger Journal: Debit Persediaan, Credit Modal Awal (Ekuitas)
      const year = openingDate.getFullYear().toString();
      const [journalSeq] = await reserveNumbers(tx, tenantId, "JRN", 1);
      const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

      const getOrCreateAccount = async (
        code: string,
        name: string,
        type: string,
        normalBalance: string,
      ) => {
        let acc = await tx.account.findUnique({
          where: { tenantId_code: { tenantId, code } },
        });
        if (!acc) {
          acc = await tx.account.create({
            data: {
              tenantId,
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

      const equityAccount = await getOrCreateAccount(
        "MODAL_AWAL",
        "Ekuitas Saldo Awal",
        "EQUITY",
        "CREDIT",
      );

      const openingValNum = totalOpeningValue.toNumber();

      await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber: journalNumber,
          entryDate: openingDate,
          referenceType: "MIGRATION",
          referenceId: `MIG-${tenantId}`,
          description: notes || "Jurnal Saldo Awal Persediaan Migrasi",
          status: "POSTED",
          lines: {
            create: [
              { accountId: inventoryAccount.id, debit: openingValNum, credit: 0 },
              { accountId: equityAccount.id, debit: 0, credit: openingValNum },
            ],
          },
        },
      });

      // 7. Update any active MigrationJob status
      await tx.migrationJob.updateMany({
        where: { tenantId, status: { in: ["WAITING_FILE", "pending", "PENDING"] } },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return {
        importedCount,
        totalOpeningValue,
        journalNumber,
      };
    });
  }
}
