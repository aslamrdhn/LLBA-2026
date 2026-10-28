import { redis } from "../lib/redis.ts";
import { PrismaTransaction, prisma } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";

const KDS_STATE_MACHINE: Record<string, string[]> = {
  NEW: ["IN_PROGRESS", "READY"],
  IN_PROGRESS: ["READY", "COMPLETED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function createKitchenOrder(
  tx: PrismaTransaction,
  salesId: string,
  outletId: string,
) {
  const sale = await tx.salesHeader.findUnique({
    where: { id: salesId },
    include: {
      details: {
        include: { menu: true },
      },
    },
  });

  if (!sale) throw new LedgerError("VAL_002", "Sale not found");

  const items = sale.details.map((d) => ({
    menu_name: d.menu.name,
    quantity: d.quantity,
    note: "",
  }));

  const order = await tx.kitchenOrder.create({
    data: {
      salesId,
      outletId,
      orderNumber: sale.invoiceNumber,
      items: JSON.stringify(items),
      status: "NEW",
      version: 0,
    },
  });

  return order;
}

export async function publishKitchenOrder(
  outletId: string,
  order: any,
): Promise<void> {
  await redis.publish(
    `kitchen:${outletId}`,
    JSON.stringify({ type: "NEW", order }),
  );
}

export async function updateKitchenOrderStatus(
  orderId: string,
  status: "NEW" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED",
  userId: string,
) {
  const order = await prisma.kitchenOrder.findUnique({
    where: { id: orderId },
    include: { sales: { include: { outlet: true } } },
  });

  if (!order) throw new LedgerError("VAL_002", "Order not found");

  const allowedTransitions = KDS_STATE_MACHINE[order.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw new LedgerError(
      "KDS_001",
      `Invalid state transition: ${order.status} → ${status}. Allowed: ${allowedTransitions.join(", ")}`,
    );
  }

  const updateData: any = { status, version: { increment: 1 } };
  if (status === "IN_PROGRESS") updateData.startedAt = new Date();
  if (status === "READY") updateData.readyAt = new Date();
  if (status === "COMPLETED") updateData.completedAt = new Date();
  if (status === "CANCELLED") updateData.cancelledAt = new Date();

  const oldVersion = order.version;
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.kitchenOrder.updateMany({
      where: { id: orderId, version: oldVersion },
      data: updateData,
    });

    if (updated.count === 0) {
      throw new LedgerError("LOCK_001", "KDS update conflict");
    }

    await tx.auditLog.create({
      data: {
        tenantId: order.sales.tenantId,
        userId,
        action: "KITCHEN_STATUS_UPDATE",
        severity: "info",
        metadata: JSON.stringify({
          orderId,
          status,
          orderNumber: order.orderNumber,
          previousStatus: order.status,
        }),
      },
    });

    return tx.kitchenOrder.findUnique({ where: { id: orderId } });
  });

  await redis.publish(
    `kitchen:${order.sales.outletId}`,
    JSON.stringify({ type: "UPDATE", orderId, status, order: result }),
  );

  return result;
}

export async function updateKitchenOrderQuantity(
  salesId: string,
  refundedItems: Array<{ menuName: string; quantity: number }>,
  tx?: PrismaTransaction,
) {
  const db = tx || prisma;
  const order = await db.kitchenOrder.findUnique({
    where: { salesId },
  });

  if (!order || order.status === "COMPLETED" || order.status === "CANCELLED") {
    return;
  }

  const items = (JSON.parse(order.items || "[]") as any[]).map((i) => ({
    ...i,
  }));
  for (const ref of refundedItems) {
    const it = items.find((i) => i.menu_name === ref.menuName);
    if (it) {
      it.quantity = Math.max(0, it.quantity - ref.quantity);
    }
  }

  const updated = await db.kitchenOrder.update({
    where: { id: order.id },
    data: {
      items: JSON.stringify(items),
      version: { increment: 1 },
    },
  });

  await redis.publish(
    `kitchen:${order.outletId}`,
    JSON.stringify({ type: "UPDATE_QUANTITY", orderId: order.id, items }),
  );

  return updated;
}
