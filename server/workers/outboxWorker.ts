import { prisma, withTenant, PrismaTransaction } from "../lib/prisma.ts";
import { redis } from "../lib/redis.ts";
import { FifoCostEngine } from "../domain/cost-engine/FifoCostEngine.ts";

const SWEEP_INTERVAL = 60 * 1000;
const BATCH_SIZE = 500;
const MAX_SWEEP_LOOPS = 10;
const YIELD_INTERVAL_MS = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startOutboxWorker() {
  console.log(
    "📡 Outbox Worker started (sweep: 60s, batch: 500, bounded loops: 10, yield: 100ms, atomic UPDATE)",
  );

  let isSweeping = false;

  setInterval(async () => {
    if (isSweeping) {
      console.warn("⚠️ Sweep already running, skipping this interval.");
      return;
    }
    isSweeping = true;
    try {
      await sweepOutbox();
    } catch (error: any) {
      console.error("❌ Sweep error:", error.message);
    } finally {
      isSweeping = false;
    }
  }, SWEEP_INTERVAL);
}

async function sweepOutbox() {
  let processedCount = 0;
  let loopCount = 0;
  let hasMore = true;

  while (hasMore && loopCount < MAX_SWEEP_LOOPS) {
    const rawIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM outbox
      WHERE status = 'PENDING' AND retry_count < max_retry
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (!rawIds || rawIds.length === 0) {
      hasMore = false;
      break;
    }

    const ids = rawIds.map((r) => r.id);

    await prisma.outbox.updateMany({
      where: { id: { in: ids } },
      data: { status: "PROCESSING", processedAt: new Date() },
    });

    const claimedEvents = await prisma.outbox.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: "asc" },
    });

    for (const ev of claimedEvents) {
      try {
        const payload =
          typeof ev.payload === "string" ? JSON.parse(ev.payload) : ev.payload;
        await withTenant(ev.tenantId, async (tx: PrismaTransaction) => {
          await processEvent(tx, ev.id, ev.eventType, payload);
        });
      } catch (err: any) {
        console.error(`❌ Failed event ${ev.id}:`, err.message);
        try {
          await prisma.outbox.update({
            where: { id: ev.id },
            data: {
              status: "PENDING",
              retryCount: { increment: 1 },
              errorMessage: err.message,
            },
          });
        } catch {}
      }
    }

    processedCount += claimedEvents.length;
    loopCount++;

    if (claimedEvents.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      const remaining = await prisma.$queryRaw<{ count: bigint | number }[]>`
        SELECT COUNT(*) as count FROM outbox WHERE status = 'PENDING' AND retry_count < max_retry
      `;
      const count = Number(remaining[0]?.count || 0);
      if (count === 0) {
        hasMore = false;
      } else {
        await sleep(YIELD_INTERVAL_MS);
      }
    }
  }

  if (processedCount > 0) {
    console.log(
      `✅ Sweep processed ${processedCount} events (loops: ${loopCount})`,
    );
  }
}

async function processEvent(
  tx: PrismaTransaction,
  eventId: string,
  eventType: string,
  payload: any,
) {
  try {
    switch (eventType) {
      case "SaleCreated":
        await handleSaleCreated(tx, payload);
        break;
      case "SaleVoided":
        await handleSaleVoided(tx, payload);
        break;
      case "PeriodClosed":
        await handlePeriodClosed(tx, payload);
        break;
      case "StockConflictAlert":
        await handleStockConflictAlert(tx, payload);
        break;
      case "FifoAllocationJob":
        await handleFifoAllocationJob(tx, payload);
        break;
      default:
        console.warn(`Unknown event type: ${eventType}`);
    }

    await tx.outbox.update({
      where: { id: eventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error(`❌ Error processing event ${eventId}:`, error.message);

    // ✅ FIX: Use global prisma instance because tx may be rolled back
    const record = await prisma.outbox.findUnique({ where: { id: eventId } });
    if (record) {
      const retryCount = record.retryCount + 1;
      const newStatus = retryCount >= record.maxRetry ? "FAILED" : "PENDING";
      await prisma.outbox.update({
        where: { id: eventId },
        data: {
          status: newStatus,
          retryCount: retryCount,
          errorMessage: error instanceof Error ? error.message : String(error),
          ...(newStatus === "FAILED" ? { processedAt: new Date() } : {}),
        },
      });
    }
  }
}

async function handleSaleCreated(tx: PrismaTransaction, payload: any) {
  const sale = await tx.salesHeader.findUnique({
    where: { id: payload.saleId },
    include: { outlet: true },
  });

  if (sale) {
    const qrMenu = await tx.qrMenu.findFirst({
      where: {
        tenantId: sale.tenantId,
        outletId: sale.outletId,
      },
    });

    if (qrMenu) {
      await redis.del(`qr_menu:${qrMenu.slug}`);
    }
  }

  console.log(
    `📊 Sale created: ${payload.invoice || payload.invoiceNumber || sale?.invoiceNumber}`,
  );
}

async function handleSaleVoided(tx: PrismaTransaction, payload: any) {
  console.log(`🔄 Sale voided: ${payload.invoiceNumber}`);
  const managers = await tx.userProfile.findMany({
    where: {
      tenantId: payload.tenantId,
      role: { in: ["owner", "super_admin"] },
      status: "active",
    },
    select: { userId: true },
  });

  for (const manager of managers) {
    await tx.notification.create({
      data: {
        tenantId: payload.tenantId,
        userId: manager.userId,
        type: "SALE_VOIDED",
        message: `Transaksi ${payload.invoiceNumber} telah di-void`,
        severity: "warning",
      },
    });
  }
}

async function handlePeriodClosed(tx: PrismaTransaction, payload: any) {
  console.log(`📄 Period closed: ${payload.periodId}`);
  await tx.archiveJob.create({
    data: {
      tenantId: payload.tenantId,
      periodId: payload.periodId,
      reportType: "DAILY_CLOSING",
      status: "PENDING",
    },
  });
}

async function handleStockConflictAlert(tx: PrismaTransaction, payload: any) {
  const managers = await tx.userProfile.findMany({
    where: {
      tenantId: payload.tenantId,
      role: { in: ["owner", "super_admin"] },
      status: "active",
    },
    select: { userId: true },
  });

  for (const manager of managers) {
    await tx.notification.create({
      data: {
        tenantId: payload.tenantId,
        userId: manager.userId,
        type: "STOCK_CONFLICT",
        message: `Stock conflict detected for offline transaction. Please review.`,
        severity: "warning",
      },
    });
  }
}

async function handleFifoAllocationJob(tx: PrismaTransaction, payload: any) {
  const job = await tx.fifoAllocationJob.findFirst({
    where: { salesId: payload.salesId },
    include: {
      sales: {
        include: {
          details: true,
          outlet: { include: { defaultWarehouse: true } },
        },
      },
    },
  });

  if (!job || job.status !== "PENDING") return;

  await tx.fifoAllocationJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING" },
  });

  try {
    const engine = new FifoCostEngine();
    const allocations = JSON.parse(job.allocations || "[]") as any[];
    const hppResult = await engine.allocateSalesCost(
      allocations,
      job.salesId,
      job.tenantId,
      job.sales.outletId,
      tx,
    );

    await tx.salesHeader.update({
      where: { id: job.salesId },
      data: { totalHpp: hppResult.totalHpp.toNumber(), isHppCalculated: true },
    });

    const sale = await tx.salesHeader.findUnique({
      where: { id: job.salesId },
    });
    if (sale && sale.hppJournalLineId && sale.inventoryJournalLineId) {
      await tx.journalLine.update({
        where: { id: sale.hppJournalLineId },
        data: { debit: hppResult.totalHpp.toNumber() },
      });
      await tx.journalLine.update({
        where: { id: sale.inventoryJournalLineId },
        data: { credit: hppResult.totalHpp.toNumber() },
      });
    }

    await tx.fifoAllocationJob.update({
      where: { id: job.id },
      data: { status: "SUCCESS", completedAt: new Date() },
    });

    await tx.outbox.create({
      data: {
        tenantId: job.tenantId,
        eventType: "HPPAllocated",
        payload: JSON.stringify({
          salesId: job.salesId,
          totalHpp: hppResult.totalHpp.toNumber(),
        }),
      },
    });

    console.log(
      `💰 HPP allocated for sale ${sale?.invoiceNumber}: ${hppResult.totalHpp.toNumber()}`,
    );
  } catch (error: any) {
    console.error(
      `❌ FIFO allocation failed for job ${job.id}:`,
      error.message,
    );
    const retryCount = job.retryCount + 1;
    const newStatus = retryCount >= job.maxRetry ? "FAILED" : "PENDING";
    await tx.fifoAllocationJob.update({
      where: { id: job.id },
      data: {
        status: newStatus,
        retryCount: retryCount,
        errorMessage: error.message,
      },
    });
  }
}
