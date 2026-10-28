import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  authenticateToken,
  enforceTenantBoundary,
  crossOutletValidation,
} from "../middlewares/auth.ts";
import { checkout } from "../services/checkout.service.ts";
import { voidSale, voidFallback } from "../services/void.service.ts";
import {
  processRefund,
  getRefundableItems,
} from "../services/refund.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { OverrideService } from "../services/override.service.ts";

import { prisma } from "../lib/prisma.ts";

export const posRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // Apply auth and tenant boundary to all POS routes
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", enforceTenantBoundary);

  // POST /api/pos/checkout
  fastify.post("/checkout", async (request, reply) => {
    try {
      const body = request.body as any;
      const tenantId = request.user!.tenantId!;
      const cashierId = request.user!.userId;

      // Cross-outlet access validation
      if (
        body.outletId &&
        !crossOutletValidation(body.outletId, request.user?.assignedOutlets)
      ) {
        return reply.code(403).send({
          success: false,
          error: "AUT_002",
          message: `Cashier not authorized for outlet ${body.outletId}`,
        });
      }

      const result = await checkout({
        ...body,
        tenantId,
        cashierId,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error during checkout",
      });
    }
  });

  // POST /api/pos/checkout/offline-sync (§8.9b Receipt Gap Recovery & Offline Sync)
  fastify.post("/checkout/offline-sync", async (request, reply) => {
    try {
      const body = request.body as {
        outletId: string;
        transactions: Array<{
          offlineId: string;
          receiptSeq?: number;
          items: any[];
          payments: any[];
          discountPercent?: number;
          note?: string;
          offlineCreatedAt?: string;
        }>;
      };

      const tenantId = request.user!.tenantId!;
      const cashierId = request.user!.userId;

      if (!body.transactions || !Array.isArray(body.transactions) || body.transactions.length === 0) {
        return reply.code(400).send({
          success: false,
          error: "VAL-001",
          message: "Daftar transaksi offline tidak boleh kosong",
        });
      }

      // Validasi izin outlet
      if (
        body.outletId &&
        !crossOutletValidation(body.outletId, request.user?.assignedOutlets)
      ) {
        return reply.code(403).send({
          success: false,
          error: "AUT_002",
          message: `Cashier not authorized for outlet ${body.outletId}`,
        });
      }

      // Urutkan transaksi secara kronologis berdasarkan waktu offline
      const sorted = [...body.transactions].sort((a, b) => {
        const timeA = a.offlineCreatedAt ? new Date(a.offlineCreatedAt).getTime() : 0;
        const timeB = b.offlineCreatedAt ? new Date(b.offlineCreatedAt).getTime() : 0;
        return timeA - timeB;
      });

      // Deteksi Celah Nomor Struk (Receipt Gap Recovery - R8)
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].receiptSeq && sorted[i - 1].receiptSeq) {
          const diff = sorted[i].receiptSeq! - sorted[i - 1].receiptSeq!;
          if (diff > 1) {
            for (let g = sorted[i - 1].receiptSeq! + 1; g < sorted[i].receiptSeq!; g++) {
              gaps.push(g);
            }
          }
        }
      }

      const results = [];
      let syncedCount = 0;
      let failedCount = 0;

      for (const tx of sorted) {
        try {
          const res = await checkout({
            tenantId,
            outletId: body.outletId,
            cashierId,
            items: tx.items,
            payments: tx.payments,
            discountPercent: tx.discountPercent || 0,
            note: tx.note ? `[OFFLINE] ${tx.note}` : "[OFFLINE SYNC]",
            idempotencyKey: tx.offlineId,
            skipPeriodValidation: true,
            useHistoricalPrices: true,
            originalBusinessDate: tx.offlineCreatedAt,
          });

          await prisma.offlineTransaction.upsert({
            where: {
              tenantId_offlineId: {
                tenantId,
                offlineId: tx.offlineId,
              },
            },
            create: {
              tenantId,
              outletId: body.outletId,
              cashierId,
              offlineId: tx.offlineId,
              payload: JSON.stringify(tx),
              status: "SYNCED",
              salesId: res.sale.id,
              syncedAt: new Date(),
            },
            update: {
              status: "SYNCED",
              salesId: res.sale.id,
              syncedAt: new Date(),
            },
          });

          syncedCount++;
          results.push({
            offlineId: tx.offlineId,
            status: "SUCCESS",
            salesId: res.sale.id,
            invoiceNumber: res.sale.invoiceNumber,
          });
        } catch (err: any) {
          failedCount++;
          await prisma.offlineTransaction.upsert({
            where: {
              tenantId_offlineId: {
                tenantId,
                offlineId: tx.offlineId,
              },
            },
            create: {
              tenantId,
              outletId: body.outletId,
              cashierId,
              offlineId: tx.offlineId,
              payload: JSON.stringify(tx),
              status: "FAILED",
              errorMessage: err.message,
            },
            update: {
              status: "FAILED",
              errorMessage: err.message,
              attempts: { increment: 1 },
            },
          });

          results.push({
            offlineId: tx.offlineId,
            status: "FAILED",
            error: err.code || "ERR",
            message: err.message,
          });
        }
      }

      return reply.code(200).send({
        success: true,
        summary: {
          total: sorted.length,
          synced: syncedCount,
          failed: failedCount,
          receiptGapDetected: gaps.length > 0,
          detectedGaps: gaps,
        },
        results,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Gagal memproses sinkronisasi offline",
      });
    }
  });

  // POST /api/pos/void
  fastify.post("/void", async (request, reply) => {
    try {
      const body = request.body as any;
      const tenantId = request.user!.tenantId!;
      const cashierId = request.user!.userId;

      const result = await voidSale({
        tenantId,
        salesId: body.salesId,
        cashierId,
        reason: body.reason,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error during void",
      });
    }
  });

  // POST /api/pos/void-fallback
  fastify.post("/void-fallback", async (request, reply) => {
    try {
      const body = request.body as any;
      const tenantId = request.user!.tenantId!;
      const cashierId = request.user!.userId;

      const result = await voidFallback({
        tenantId,
        outletId: body.outletId,
        cashierId,
        offlineId: body.offlineId,
        reason: body.reason,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error during void fallback",
      });
    }
  });

  // POST /api/pos/refund
  fastify.post("/refund", async (request, reply) => {
    try {
      const body = request.body as any;
      const tenantId = request.user!.tenantId!;
      const cashierId = request.user!.userId;

      const result = await processRefund({
        ...body,
        tenantId,
        cashierId,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error during refund",
      });
    }
  });

  // GET /api/pos/refund/items/:salesId
  fastify.get("/refund/items/:salesId", async (request, reply) => {
    try {
      const { salesId } = request.params as { salesId: string };
      const tenantId = request.user!.tenantId!;

      const items = await getRefundableItems(salesId, tenantId);

      return reply.code(200).send({
        success: true,
        data: items,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error fetching refundable items",
      });
    }
  });

  // POST /api/pos/manager-override (§2.4, §8.14 Manager Override PIN)
  fastify.post("/manager-override", async (request, reply) => {
    try {
      const idempotencyKey = request.headers["idempotency-key"] as string | undefined;
      if (!idempotencyKey) {
        return reply.code(400).send({
          success: false,
          error: "VAL_001",
          message: "Header 'Idempotency-Key' wajib disertakan untuk setiap permintaan Manager Override.",
        });
      }

      const body = request.body as {
        actionType: any;
        entityId: string;
        reason: string;
        managerPin: string;
        outletId?: string;
      };

      const tenantId = request.user!.tenantId!;
      const cashierUserId = request.user!.userId;
      const cashierRole = request.user!.role || "CASHIER";
      const deviceId = (request.headers["x-device-id"] as string) || request.ip;

      const result = await OverrideService.verifyManagerOverride({
        tenantId,
        cashierUserId,
        cashierRole,
        actionType: body.actionType,
        entityId: body.entityId,
        reason: body.reason,
        managerPin: body.managerPin,
        deviceId,
        outletId: body.outletId,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error during manager override verification",
      });
    }
  });
};

