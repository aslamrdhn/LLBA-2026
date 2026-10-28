import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  authenticateToken,
  enforceTenantBoundary,
} from "../middlewares/auth.ts";
import { prisma } from "../lib/prisma.ts";
import { maskCostData } from "../serializers/mask-cost.serializer.ts";

export const syncRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", enforceTenantBoundary);

  fastify.get("/state", async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId!;
      const userRole = request.user?.role;

      const [products, rawMaterials, recipes, orders, appConfig] =
        await Promise.all([
          prisma.menu.findMany({
            where: { tenantId, isActive: true },
          }),
          prisma.item.findMany({
            where: { tenantId, status: "ACTIVE" },
            include: { unit: true },
          }),
          prisma.recipe.findMany({
            where: { tenantId },
          }),
          prisma.salesHeader.findMany({
            where: { tenantId, status: { in: ["POSTED", "PENDING_SYNC"] } },
            include: { details: true, payments: true },
          }),
          prisma.tenant.findUnique({
            where: { id: tenantId },
          }),
        ]);

      // Using empty array for tables since we don't have a Table model in the schema
      const tables: any[] = [];

      const payload = {
        products,
        rawMaterials,
        recipes,
        tables,
        orders,
        appConfig,
      };

      return reply.code(200).send({
        success: true,
        ...maskCostData(payload, userRole),
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
