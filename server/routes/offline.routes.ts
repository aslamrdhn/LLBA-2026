import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  authenticateToken,
  enforceTenantBoundary,
} from "../middlewares/auth.ts";
import { prisma } from "../lib/prisma.ts";
import { createId } from "@paralleldrive/cuid2";

export const offlineRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", enforceTenantBoundary);

  // POST /api/offline/sync-batch (HTTP 202 Accepted)
  fastify.post("/sync-batch", async (request, reply) => {
    try {
      const { transactions } = request.body as { transactions: any[] };

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return reply.code(400).send({
          success: false,
          error: "VAL-001",
          message: "Transactions array cannot be empty",
        });
      }

      if (transactions.length > 20) {
        return reply.code(400).send({
          success: false,
          error: "VAL-002",
          message: "Batch exceeds maximum limit of 20 transactions",
        });
      }

      const tenantId = request.user!.tenantId!;
      const cashierId = request.user!.userId;
      const allowedOutletIds =
        (request.user?.assignedOutlets as string[]) || [];

      // Validate outlets
      for (const payload of transactions) {
        if (
          !payload.outletId ||
          (!allowedOutletIds.includes("*") &&
            !allowedOutletIds.includes(payload.outletId))
        ) {
          return reply.code(403).send({
            success: false,
            error: "AUT-002",
            message: `Outlet ${payload.outletId} not authorized for this cashier`,
          });
        }
      }

      const now = new Date();
      const records = transactions.map((payload) => ({
        tenantId,
        outletId: payload.outletId,
        cashierId,
        offlineId: payload.offlineId || payload.idempotencyKey || createId(),
        payload: payload,
        status: "PENDING_SYNC",
        attempts: 0,
        createdAt: now,
      }));

      await prisma.offlineTransaction.createMany({
        data: records,
        skipDuplicates: true,
      });

      return reply.code(202).send({
        success: true,
        message: "Accepted for asynchronous processing",
        queued: records.length,
        offlineIds: records.map((r) => r.offlineId),
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error in offline sync-batch",
      });
    }
  });

  // GET /api/offline/status/:offlineId
  fastify.get("/status/:offlineId", async (request, reply) => {
    try {
      const { offlineId } = request.params as { offlineId: string };
      const tenantId = request.user!.tenantId!;

      const record = await prisma.offlineTransaction.findUnique({
        where: { tenantId_offlineId: { tenantId, offlineId } },
      });

      if (!record) {
        return reply.code(404).send({
          success: false,
          status: "NOT_FOUND",
          message: "Offline transaction not found",
        });
      }

      return reply.code(200).send({
        success: true,
        data: record,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });
};
