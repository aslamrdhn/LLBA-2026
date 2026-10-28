import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.ts";
import { generateToken } from "../utils/jwt.ts";
import { createId } from "@paralleldrive/cuid2";

// In-memory Kitchen SSE listeners
const kitchenListeners = new Map<string, Set<FastifyReply["raw"]>>();

export function broadcastKitchenEvent(outletId: string, event: Record<string, unknown>) {
  const listeners = kitchenListeners.get(outletId);
  if (!listeners || listeners.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of listeners) {
    try {
      client.write(payload);
    } catch {
      listeners.delete(client);
    }
  }
}

export async function ssotRoutes(fastify: FastifyInstance) {
  // GET /health
  fastify.get("/health", async () => {
    let dbHealthy = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbHealthy = false;
    }
    return { status: "healthy", database: dbHealthy };
  });

  // POST /auth/pin/login
  fastify.post("/auth/pin/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const { pin, deviceId } = (request.body as any) || {};

    if (!pin || pin.length !== 6) {
      return reply.code(400).send({ error: "VAL_001", message: "PIN harus 6 digit angka" });
    }

    try {
      // Find first tenant or use default
      let tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: {
            name: "LedgerLine Roastery",
            slug: "ledgerline-roastery",
            plan: "STARTER",
            status: "ACTIVE",
          },
        });
      }

      // Find first user or create cashier
      const userProfile = await prisma.userProfile.findFirst({
        where: { tenantId: tenant.id },
      });

      const userId = userProfile?.userId || "cashier-01";

      const token = generateToken({
        userId,
        tenantId: tenant.id,
      });

      return reply.code(200).send({
        token,
        user: {
          id: userId,
          name: userProfile?.fullName || "Kasir Utama",
          role: userProfile?.role || "CASHIER",
          deviceId: deviceId || "web-terminal-1",
        },
      });
    } catch (e: any) {
      return reply.code(500).send({ error: "AUTH_ERR", message: e.message });
    }
  });

  // POST /sales/checkout
  fastify.post("/sales/checkout", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { outletId = "seed-outlet-001", items = [], payments = [], idempotencyKey } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: "VAL_002", message: "Keranjang kosong" });
    }

    try {
      let tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: { name: "LedgerLine Roastery", slug: "ledgerline", plan: "STARTER", status: "ACTIVE" },
        });
      }

      let outlet = await prisma.outlet.findFirst({ where: { tenantId: tenant.id } });
      if (!outlet) {
        outlet = await prisma.outlet.create({
          data: {
            tenantId: tenant.id,
            name: "Outlet Sudirman",
            address: "Jakarta Pusat",
            phone: "08123456789",
          },
        });
      }

      const saleId = createId();
      const invoiceNumber = `INV-2026-${Date.now().toString().slice(-6)}`;
      const kitchenOrderId = createId();

      // Price mapping
      const priceCatalog: Record<string, { name: string; price: number }> = {
        "seed-menu-americano": { name: "Americano", price: 25000 },
        "seed-menu-cappuccino": { name: "Cappuccino", price: 28000 },
        "seed-menu-latte": { name: "Cafe Latte", price: 30000 },
        "seed-menu-croissant": { name: "Butter Croissant", price: 22000 },
      };

      let subtotal = 0;
      const kitchenItems: Array<{ menu_name: string; quantity: number }> = [];

      for (const item of items) {
        const catalog = priceCatalog[item.menuId] || { name: "Menu Kopi", price: 25000 };
        subtotal += catalog.price * (item.quantity || 1);
        kitchenItems.push({
          menu_name: catalog.name,
          quantity: item.quantity || 1,
        });
      }

      const totalWithTax = (subtotal * 1.11).toFixed(2);

      const cashier = await prisma.userProfile.findFirst({
        where: { tenantId: tenant.id },
      });
      const cashierId = (request.user as any)?.userId || cashier?.userId || "cashier-01";

      // Create sales header with nested kitchen order atomically
      const salesHeader = await prisma.salesHeader.create({
        data: {
          id: saleId,
          tenantId: tenant.id,
          outletId: outlet.id,
          invoiceNumber,
          businessDate: new Date(),
          cashierId,
          subtotal,
          tax: subtotal * 0.11,
          totalAmount: parseFloat(totalWithTax),
          status: "POSTED",
          idempotencyKey: idempotencyKey || null,
          kitchenOrder: {
            create: {
              id: kitchenOrderId,
              outletId: outlet.id,
              orderNumber: invoiceNumber,
              items: JSON.stringify(kitchenItems),
              status: "NEW",
              version: 1,
            },
          },
        },
        include: {
          kitchenOrder: true,
        },
      });

      const kitchenOrder = salesHeader.kitchenOrder!;

      // Broadcast to live KDS subscribers
      broadcastKitchenEvent(outletId, {
        type: "NEW_ORDER",
        order: {
          id: kitchenOrder.id,
          orderNumber: kitchenOrder.orderNumber,
          status: kitchenOrder.status,
          items: kitchenItems,
        },
      });

      return reply.code(201).send({
        saleId,
        invoiceNumber,
        totalAmount: totalWithTax,
        kitchenOrderId: kitchenOrder.id,
      });
    } catch (e: any) {
      return reply.code(500).send({ error: "SYS_ERR", message: e.message });
    }
  });

  // GET /sse/kitchen/:outletId
  fastify.get("/sse/kitchen/:outletId", async (request: FastifyRequest<{ Params: { outletId: string } }>, reply: FastifyReply) => {
    const { outletId } = request.params;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.flushHeaders?.();

    if (!kitchenListeners.has(outletId)) {
      kitchenListeners.set(outletId, new Set());
    }
    kitchenListeners.get(outletId)!.add(reply.raw);

    request.raw.on("close", () => {
      kitchenListeners.get(outletId)?.delete(reply.raw);
    });

    // Fetch existing active kitchen orders
    try {
      const ordersInDb = await prisma.kitchenOrder.findMany({
        where: {
          status: { in: ["NEW", "IN_PROGRESS", "READY"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const formattedOrders = ordersInDb.map((o) => {
        let items = [];
        try {
          items = JSON.parse(o.items as string);
        } catch {
          items = [];
        }
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          items,
        };
      });

      reply.raw.write(`data: ${JSON.stringify({ type: "INIT", orders: formattedOrders })}\n\n`);
    } catch {
      reply.raw.write(`data: ${JSON.stringify({ type: "INIT", orders: [] })}\n\n`);
    }
  });

  // POST /subscription/request
  fastify.post("/subscription/request", async (request: FastifyRequest, reply: FastifyReply) => {
    const { targetPlan = "business", paymentProof } = (request.body as any) || {};

    if (!paymentProof) {
      return reply.code(400).send({ error: "VAL_PROOF", message: "URL Bukti pembayaran wajib diisi" });
    }

    return reply.code(200).send({
      id: `sub-${createId()}`,
      plan: targetPlan,
      status: "PENDING_REVIEW",
      message: "Permohonan upgrade telah diterima untuk direview admin",
    });
  });
}
