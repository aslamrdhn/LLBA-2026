import { PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";

export async function reserveNumbers(
  tx: PrismaTransaction,
  tenantId: string,
  prefix: string,
  batchSize: number = 10,
): Promise<number[]> {
  const year = new Date().getFullYear().toString();
  const seq = await tx.numberSequence.upsert({
    where: {
      tenantId_prefix_year: { tenantId, prefix, year },
    },
    update: {
      lastNumber: { increment: batchSize },
    },
    create: {
      tenantId,
      prefix,
      year,
      lastNumber: batchSize,
    },
  });

  const start = seq.lastNumber - batchSize + 1;
  return Array.from({ length: batchSize }, (_, i) => start + i);
}

export async function markNumberUsed(
  tx: PrismaTransaction,
  tenantId: string,
  number: string,
): Promise<void> {
  await tx.numberStatus.create({
    data: { tenantId, number, status: "USED" },
  });
}

export async function reclaimOrphanedNumbers(
  tx: PrismaTransaction,
  tenantId?: string,
): Promise<void> {
  const where = tenantId
    ? { tenantId, status: "RESERVED" }
    : { status: "RESERVED" };

  await tx.numberStatus.updateMany({
    where: {
      ...where,
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    data: {
      status: "CANCELLED",
      note: "Orphaned due to server crash or period closing",
    },
  });
}
