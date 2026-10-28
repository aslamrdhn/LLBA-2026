import { PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { assertInvariant } from "../utils/invariants.ts";

export async function validatePeriod(
  tx: PrismaTransaction,
  tenantId: string,
  businessDate: Date,
): Promise<void> {
  const period = await tx.period.findFirst({
    where: {
      tenantId,
      startDate: { lte: businessDate },
      endDate: { gte: businessDate },
    },
  });

  if (!period) {
    throw new LedgerError(
      "PER_001",
      `No active period for date ${businessDate.toISOString().split("T")[0]}`,
    );
  }

  assertInvariant(
    period.status !== "HARD_CLOSED",
    "PER_002",
    `Period ${period.name} is HARD_CLOSED. No new transactions allowed.`,
  );
}

export async function reopenPeriod(
  tx: PrismaTransaction,
  tenantId: string,
  periodId: string,
  userId: string,
): Promise<void> {
  const period = await tx.period.findUnique({
    where: { id: periodId, tenantId },
  });

  if (!period) {
    throw new LedgerError("PER_003", `Period ${periodId} not found`);
  }

  assertInvariant(
    period.status === "SOFT_CLOSED",
    "PER_004",
    `Only SOFT_CLOSED periods can be reopened. Current status: ${period.status}`,
  );

  const previousStatus = period.status;
  await tx.period.update({
    where: { id: period.id },
    data: {
      status: "OPEN",
      reopenedAt: new Date(),
      reopenedBy: userId,
    },
  });

  await tx.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "PERIOD_REOPEN",
      severity: "warning",
      metadata: JSON.stringify({
        periodId: period.id,
        periodName: period.name,
        previousStatus,
      }),
    },
  });
}

export async function closePeriod(
  tx: PrismaTransaction,
  tenantId: string,
  periodId: string,
  status: "SOFT_CLOSED" | "HARD_CLOSED",
): Promise<void> {
  const period = await tx.period.findUnique({
    where: { id: periodId, tenantId },
  });

  if (!period) {
    throw new LedgerError("PER_003", `Period ${periodId} not found`);
  }

  if (status === "SOFT_CLOSED" && period.status !== "OPEN") {
    throw new LedgerError(
      "PER_004",
      `Only OPEN periods can be SOFT_CLOSED. Current status: ${period.status}`,
    );
  }

  if (status === "HARD_CLOSED" && period.status !== "SOFT_CLOSED") {
    throw new LedgerError(
      "PER_004",
      `Only SOFT_CLOSED periods can be HARD_CLOSED. Current status: ${period.status}`,
    );
  }

  await tx.period.update({
    where: { id: period.id },
    data: {
      status,
      closedAt: new Date(),
    },
  });
}
