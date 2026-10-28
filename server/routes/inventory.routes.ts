import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  authenticateToken,
  enforceTenantBoundary,
} from "../middlewares/auth.ts";
import {
  StockOpnameService,
  WasteService,
} from "../services/inventory.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { prisma } from "../lib/prisma.ts";

const opnameService = new StockOpnameService();
const wasteService = new WasteService();

export const inventoryRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", enforceTenantBoundary);

  // GET /api/inventory/opname/pending-check (BIZ-010)
  fastify.get("/opname/pending-check", async (request, reply) => {
    try {
      const { outletId } = request.query as { outletId?: string };
      const tenantId = request.user!.tenantId!;

      const activeOpname = await prisma.stockOpname.findFirst({
        where: {
          tenantId,
          ...(outletId ? { outletId } : {}),
          status: { in: ["draft", "in_progress", "DRAFT", "IN_PROGRESS", "OPEN"] },
        },
      });

      return reply.code(200).send({
        success: true,
        isOpnamePending: !!activeOpname,
        activeOpname: activeOpname
          ? {
              id: activeOpname.id,
              outletId: activeOpname.outletId,
              status: activeOpname.status,
              createdAt: activeOpname.createdAt,
            }
          : null,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // Stock Opname
  fastify.post("/opname", async (request, reply) => {
    try {
      const body = request.body as any;
      const tenantId = request.user!.tenantId!;

      const result = await opnameService.create({
        ...body,
        tenantId,
      });

      return reply.code(201).send({
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
        message: error.message,
      });
    }
  });

  fastify.post("/opname/:id/confirm", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      const result = await opnameService.confirm(id, userId);

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
        message: error.message,
      });
    }
  });

  fastify.get("/opname", async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };
      const tenantId = request.user!.tenantId!;

      const result = await opnameService.list(tenantId, status);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // Waste Management
  const handleWasteCreate = async (request: any, reply: any) => {
    try {
      const body = request.body as any;
      const tenantId = request.user!.tenantId!;
      const userId = request.user!.userId;

      let outletId = body.outletId;
      if (!outletId) {
        const firstOutlet = await prisma.outlet.findFirst({ where: { tenantId } });
        outletId = firstOutlet?.id;
      }

      const itemId = body.itemId || body.materialId;
      const quantity = body.quantity !== undefined ? body.quantity : body.amount;

      if (!itemId) {
        return reply.code(400).send({ success: false, error: "VAL_001", message: "Item ID wajib diisi" });
      }

      const result = await wasteService.create({
        tenantId,
        outletId: outletId!,
        itemId,
        quantity,
        reason: body.reason || "Waste",
        createdBy: userId,
      });

      return reply.code(201).send({
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
        message: error.message,
      });
    }
  };

  fastify.post("/waste", handleWasteCreate);
  fastify.post("/inventory-waste", handleWasteCreate);

  fastify.post("/waste/:id/approve", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      const result = await wasteService.approve(id, userId);

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
        message: error.message,
      });
    }
  });

  fastify.get("/waste", async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };
      const tenantId = request.user!.tenantId!;

      const result = await wasteService.list(tenantId, status);

      return reply.code(200).send({
        success: true,
        data: result,
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
