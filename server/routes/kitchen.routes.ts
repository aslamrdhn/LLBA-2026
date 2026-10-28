import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.ts";
import { broadcastKitchenEvent } from "./ssot.routes.ts";

export const kitchenRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.patch("/orders/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = (request.body as any) || {};

    if (!["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"].includes(status)) {
      return reply.code(400).send({ error: "VAL_STATUS", message: "Status invalid" });
    }

    try {
      const updated = await prisma.kitchenOrder.update({
        where: { id },
        data: { status },
      });

      let items = [];
      try {
        items = JSON.parse(updated.items as string);
      } catch {
        items = [];
      }

      broadcastKitchenEvent(updated.outletId, {
        type: "STATUS_UPDATE",
        order: {
          id: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          items,
        },
      });

      return reply.code(200).send({ id: updated.id, status: updated.status });
    } catch (e: any) {
      return reply.code(400).send({ error: "KDS_ERR", message: e.message });
    }
  });
};
