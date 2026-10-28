import { withTenant, prisma, PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { assertInvariant } from "../utils/invariants.ts";
import { validate } from "../utils/validate.ts";
import { z } from "zod";
import { validatePeriod } from "./period.service.ts";
import { sleep } from "../utils/sleep.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";
import { redis } from "../lib/redis.ts";
import { roundMoney, balanceJournalLines, Decimal } from "../utils/money.ts";
import { reserveNumbers } from "./numbering.service.ts";
import { getBusinessDate } from "../utils/timezone.ts";

const VoidPayloadSchema = z.object({
  tenantId: z.string(),
  salesId: z.string(),
  cashierId: z.string(),
  reason: z.string().min(1).max(500),
});

export type TVoidPayload = z.infer<typeof VoidPayloadSchema>;

export async function voidSale(input: TVoidPayload) {
  const validated = validate(VoidPayloadSchema, input);
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await withTenant(
        validated.tenantId,
        async (tx: PrismaTransaction) => {
          const sale = await tx.salesHeader.findUnique({
            where: { id: validated.salesId },
            include: {
              details: true,
              kitchenOrder: true,
              returnOrders: true,
              outlet: true,
              payments: true,
            },
          });

          if (!sale) {
            throw new LedgerError(
              "VAL-002",
              `Transaction ${validated.salesId} not found`,
            );
          }

          if (sale.status !== "POSTED" && sale.status !== "LATE_ENTRY") {
            throw new LedgerError(
              "VOID-001",
              `Cannot void transaction with status ${sale.status}`,
            );
          }

          const hoursSinceSale =
            (Date.now() - sale.createdAt.getTime()) / (1000 * 60 * 60);
          assertInvariant(
            hoursSinceSale <= 24,
            "VOID-002",
            `Void only within 24 hours. Age: ${hoursSinceSale.toFixed(1)} hours.`,
          );

          await validatePeriod(tx, validated.tenantId, sale.businessDate);

          if (sale.returnOrders && sale.returnOrders.length > 0) {
            throw new LedgerError(
              "VOID-003",
              "Tidak dapat melakukan Void pada transaksi yang sudah memiliki riwayat Refund sebagian.",
            );
          }

          // Cancel Kitchen Order if exists
          if (sale.kitchenOrder) {
            const oldVersion = sale.kitchenOrder.version;
            const updatedKds = await tx.kitchenOrder.updateMany({
              where: { id: sale.kitchenOrder.id, version: oldVersion },
              data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                version: { increment: 1 },
              },
            });

            if (updatedKds.count === 0) {
              throw new LedgerError("LOCK_001", "KDS update conflict on void");
            }

            await redis.publish(
              `kitchen:${sale.outletId}`,
              JSON.stringify({ type: "CANCEL", orderId: sale.kitchenOrder.id }),
            );
          }

          if (!sale.isHppCalculated) {
            await tx.fifoAllocationJob.updateMany({
              where: { salesId: sale.id, status: "PENDING" },
              data: { status: "CANCELLED", completedAt: new Date() },
            });

            await createVoidReversingJournal(tx, sale, validated.cashierId);

            const voided = await tx.salesHeader.update({
              where: { id: sale.id },
              data: {
                status: "VOID",
                voidedAt: new Date(),
                voidedBy: validated.cashierId,
                voidReason: validated.reason,
              },
            });

            await tx.auditLog.create({
              data: {
                tenantId: validated.tenantId,
                userId: validated.cashierId,
                action: "VOID_EARLY",
                severity: "info",
                metadata: JSON.stringify({
                  salesId: sale.id,
                  invoiceNumber: sale.invoiceNumber,
                  reason: "HPP not yet calculated, FIFO job cancelled",
                }),
              },
            });

            return voided;
          }

          const engine = await CostEngineFactory.getEngine(validated.tenantId);
          await engine.rollbackSalesAllocation(sale.id, validated.tenantId, tx);

          await createVoidReversingJournal(tx, sale, validated.cashierId);

          const voided = await tx.salesHeader.update({
            where: { id: sale.id },
            data: {
              status: "VOID",
              voidedAt: new Date(),
              voidedBy: validated.cashierId,
              voidReason: validated.reason,
            },
          });

          await tx.auditLog.create({
            data: {
              tenantId: validated.tenantId,
              userId: validated.cashierId,
              action: "VOID",
              severity: "critical",
              metadata: JSON.stringify({
                salesId: sale.id,
                invoiceNumber: sale.invoiceNumber,
                reason: validated.reason,
                hoursSinceSale: hoursSinceSale.toFixed(1),
              }),
            },
          });

          await tx.outbox.create({
            data: {
              tenantId: validated.tenantId,
              eventType: "SaleVoided",
              payload: JSON.stringify({
                salesId: sale.id,
                invoiceNumber: sale.invoiceNumber,
                reason: validated.reason,
                tenantId: validated.tenantId,
              }),
            },
          });

          return voided;
        },
      );
    } catch (error: any) {
      if (
        error instanceof LedgerError &&
        (error.code === "LOCK_001" || error.code === "LOCK-001") &&
        attempt < MAX_RETRIES
      ) {
        const delay = Math.pow(2, attempt) * 50 + Math.random() * 50;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new LedgerError(
    "SYS-002",
    "Max retries exceeded for Optimistic Locking.",
  );
}

// ============================================================
// REVERSING JOURNAL — DENGAN TIMEZONE FIX
// ============================================================
async function createVoidReversingJournal(
  tx: PrismaTransaction,
  sale: any,
  cashierId: string,
) {
  // ✅ FIX: Dapatkan timezone tenant untuk business date
  const tenant = await tx.tenant.findUnique({
    where: { id: sale.tenantId },
    select: { timezone: true },
  });

  if (!tenant) {
    throw new LedgerError("VAL-002", `Tenant ${sale.tenantId} not found`);
  }

  const bizDate = getBusinessDate(
    tenant.timezone || "Asia/Jakarta",
    new Date(),
  );

  const accounts = await tx.account.findMany({
    where: { tenantId: sale.tenantId },
  });

  const getOrCreateAccount = async (
    code: string,
    name: string,
    type: string,
    normalBalance: string,
  ) => {
    let acc = accounts.find((a) => a.code === code);
    if (!acc) {
      acc = await tx.account.create({
        data: {
          tenantId: sale.tenantId,
          code,
          name,
          type,
          normalBalance,
        },
      });
    }
    return acc;
  };

  const cashAccount = await getOrCreateAccount("KAS", "Kas", "ASSET", "DEBIT");
  const bankAccount = await getOrCreateAccount(
    "BANK",
    "Bank / Non-Tunai / QRIS",
    "ASSET",
    "DEBIT",
  );
  const revenueAccount = await getOrCreateAccount(
    "PENDAPATAN",
    "Pendapatan Penjualan",
    "REVENUE",
    "CREDIT",
  );
  const hppAccount = await getOrCreateAccount(
    "HPP",
    "Harga Pokok Penjualan",
    "EXPENSE",
    "DEBIT",
  );
  const inventoryAccount = await getOrCreateAccount(
    "PERSEDIAAN",
    "Persediaan Barang",
    "ASSET",
    "DEBIT",
  );
  const taxPayableAccount = await getOrCreateAccount(
    "PPN_KELUARAN",
    "Pajak Keluaran",
    "LIABILITY",
    "CREDIT",
  );
  const serviceChargeAccount = await getOrCreateAccount(
    "SERVICE_CHARGE",
    "Service Charge",
    "LIABILITY",
    "CREDIT",
  );

  const [journalSeq] = await reserveNumbers(tx, sale.tenantId, "JRN", 1);
  const year = new Date().getFullYear().toString();
  const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

  const afterDiscount = new Decimal(sale.subtotal.toString()).minus(
    sale.discount ? sale.discount.toString() : 0,
  );

  const cashTotal = (sale.payments || [])
    .filter((p: any) => p.method === "CASH")
    .reduce(
      (sum: Decimal, p: any) => sum.plus(new Decimal(p.amount.toString())),
      new Decimal(0),
    );
  const digitalTotal = (sale.payments || [])
    .filter((p: any) => p.method !== "CASH")
    .reduce(
      (sum: Decimal, p: any) => sum.plus(new Decimal(p.amount.toString())),
      new Decimal(0),
    );

  let lines = [
    {
      accountId: revenueAccount.id,
      debit: afterDiscount,
      credit: new Decimal(0),
    },
    {
      accountId: hppAccount.id,
      debit: new Decimal(sale.totalHpp ? sale.totalHpp.toString() : 0),
      credit: new Decimal(0),
    },
    {
      accountId: inventoryAccount.id,
      debit: new Decimal(0),
      credit: new Decimal(sale.totalHpp ? sale.totalHpp.toString() : 0),
    },
    {
      accountId: taxPayableAccount.id,
      debit: new Decimal(sale.tax ? sale.tax.toString() : 0),
      credit: new Decimal(0),
    },
    {
      accountId: serviceChargeAccount.id,
      debit: new Decimal(
        sale.serviceCharge ? sale.serviceCharge.toString() : 0,
      ),
      credit: new Decimal(0),
    },
  ];

  if (cashTotal.greaterThan(0)) {
    lines.push({
      accountId: cashAccount.id,
      debit: new Decimal(0),
      credit: cashTotal,
    });
  }
  if (digitalTotal.greaterThan(0)) {
    lines.push({
      accountId: bankAccount.id,
      debit: new Decimal(0),
      credit: digitalTotal,
    });
  }
  if (cashTotal.isZero() && digitalTotal.isZero()) {
    lines.push({
      accountId: cashAccount.id,
      debit: new Decimal(0),
      credit: new Decimal(sale.totalAmount.toString()),
    });
  }

  lines = balanceJournalLines(lines);

  await tx.journalEntry.create({
    data: {
      tenantId: sale.tenantId,
      entryNumber: journalNumber,
      entryDate: bizDate, // ✅ FIX: entryDate menggunakan bizDate yang sudah di-timezone-kan
      referenceType: "VOID",
      referenceId: sale.id,
      description: `Reversing journal for void of ${sale.invoiceNumber}`,
      status: "POSTED",
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit.toNumber(),
          credit: l.credit.toNumber(),
        })),
      },
    },
  });
}

// ============================================================
// VOID FALLBACK — DENGAN IDEMPOTENCY CHECK
// ============================================================
export async function voidFallback(input: {
  tenantId: string;
  outletId: string;
  cashierId: string;
  offlineId: string;
  reason: string;
}) {
  const idem = await prisma.idempotencyRecord.findUnique({
    where: { key: input.offlineId },
  });

  if (idem) {
    const parsed =
      typeof idem.responseBody === "string"
        ? JSON.parse(idem.responseBody)
        : idem.responseBody;
    if (
      idem.responseBody === '{"processing": true}' ||
      (parsed && parsed.processing)
    ) {
      throw new LedgerError(
        "IDEM-003",
        "Transaction is still being processed. Void fallback will retry.",
      );
    }
    if (parsed && parsed.error) {
      await prisma.offlineTransaction.updateMany({
        where: { offlineId: input.offlineId, tenantId: input.tenantId },
        data: { status: "VOIDED_LOCAL" },
      });
      return {
        status: "NOT_FOUND",
        message: "Transaction failed on server, safe to void locally",
      };
    }
  }

  const sale = await prisma.salesHeader.findFirst({
    where: {
      tenantId: input.tenantId,
      offlineId: input.offlineId,
    },
  });

  if (!sale) {
    await prisma.offlineTransaction.updateMany({
      where: { offlineId: input.offlineId, tenantId: input.tenantId },
      data: { status: "VOIDED_LOCAL" },
    });
    return {
      status: "NOT_FOUND",
      message: "Transaction not on server, safe to void locally",
    };
  }

  return voidSale({
    tenantId: input.tenantId,
    salesId: sale.id,
    cashierId: input.cashierId,
    reason: input.reason,
  });
}
