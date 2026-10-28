import { prisma, withTenant } from "../lib/prisma.ts";
import { checkout } from "../services/checkout.service.ts";
import { publishKitchenOrder } from "../services/kitchen.service.ts";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const INTERVAL = 10000;
let isSyncing = false;

export async function startOfflineSyncWorker() {
  console.log("🔄 Offline Sync Worker started");

  setInterval(async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const pending = await prisma.offlineTransaction.findMany({
        where: {
          status: "PENDING_SYNC",
          attempts: { lt: MAX_ATTEMPTS },
        },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });

      if (!pending || pending.length === 0) return;

      const claimedIds = pending.map((p) => p.id);
      await prisma.offlineTransaction.updateMany({
        where: { id: { in: claimedIds } },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });

      for (const row of pending) {
        try {
          const payload =
            typeof row.payload === "string"
              ? JSON.parse(row.payload)
              : row.payload;
          const result = await checkout({
            ...payload,
            tenantId: row.tenantId,
            idempotencyKey: payload.offlineId || payload.idempotencyKey,
            skipPeriodValidation: true,
            originalBusinessDate:
              payload.originalBusinessDate || payload.businessDate || null,
          });

          await prisma.offlineTransaction.update({
            where: { id: row.id },
            data: {
              status: "SYNCED",
              syncedAt: new Date(),
              salesId: result.sale.id,
            },
          });

          if (result.kitchenOrder) {
            await publishKitchenOrder(
              result.sale.outletId,
              result.kitchenOrder,
            );
          }

          console.log(
            `✅ Offline transaction ${row.id} synced successfully (Sale: ${result.sale.invoiceNumber})`,
          );
        } catch (error: any) {
          const record = await prisma.offlineTransaction.findUnique({
            where: { id: row.id },
            select: { attempts: true },
          });

          const attempts = record?.attempts || 1;
          const newStatus =
            attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING_SYNC";

          await prisma.offlineTransaction.update({
            where: { id: row.id },
            data: {
              status: newStatus,
              errorMessage:
                error instanceof Error ? error.message : String(error),
            },
          });

          console.warn(
            `⚠️ Offline tx ${row.id} failed (attempt ${attempts}):`,
            error.message,
          );
        }
      }
    } catch (error: any) {
      console.error("❌ Offline sync worker cycle error:", error.message);
    } finally {
      isSyncing = false;
    }
  }, INTERVAL);
}
