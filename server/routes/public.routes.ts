import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.ts";
import { broadcastKitchenEvent } from "./ssot.routes.ts";

export async function publicRoutes(fastify: FastifyInstance) {
  // Get Menu by QR token/slug
  const handleGetTableMenu = async (request: any, reply: any) => {
    const { token } = request.params as any;

    // Find QrMenu by slug or id
    let qr = await prisma.qrMenu.findFirst({
      where: {
        OR: [{ slug: token }, { id: token }],
      },
      include: {
        outlet: true,
        tenant: true,
      },
    });

    if (!qr) {
      // Fallback: match by table prefix if created with generic slug
      qr = await prisma.qrMenu.findFirst({
        where: { slug: { contains: token } },
        include: { outlet: true, tenant: true },
      });
    }

    if (!qr) {
      return reply.code(404).send({
        success: false,
        error: "QR Code tidak valid atau meja belum didaftarkan di sistem.",
      });
    }

    // Get active menus for this tenant
    const items = await prisma.menu.findMany({
      where: { tenantId: qr.tenantId, isActive: true },
      orderBy: { name: "asc" },
    });

    // Group by category
    const categoryMap = new Map<string, any[]>();
    for (const item of items) {
      const cat = item.category || "Menu Utama";
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.imageUrl,
        imageUrl: item.imageUrl,
        category: cat,
      });
    }

    const tableDisplayNumber = qr.slug.replace(/[^0-9]/g, "") || qr.slug;

    return reply.send({
      success: true,
      store: {
        id: qr.tenant.id,
        name: qr.tenant.name,
      },
      table: {
        id: qr.id,
        name: `Meja ${tableDisplayNumber}`,
        number: tableDisplayNumber,
      },
      storeName: qr.tenant.name,
      tableName: `Meja ${tableDisplayNumber}`,
      tableNumber: tableDisplayNumber,
      outletId: qr.outletId,
      tenantId: qr.tenantId,
      qrMenuId: qr.id,
      currency: "IDR",
      products: items.map((it) => ({
        id: it.id,
        name: it.name,
        category: it.category || "Menu Utama",
        price: it.price,
        stock: 99,
        description: it.description || "",
        image: it.imageUrl,
        imageUrl: it.imageUrl,
      })),
      categories: Array.from(categoryMap.entries()).map(([name, its], idx) => ({
        id: "cat-" + idx,
        name,
        items: its,
      })),
    });
  };

  fastify.get("/table-public/:token", handleGetTableMenu);
  fastify.get("/orders/table-public/:token", handleGetTableMenu);

  // Public Table Self-Order Checkout
  const handleTableCheckout = async (request: any, reply: any) => {
    const payload = request.body as any;

    try {
      // Normalize incoming payload formats
      const tenantId = payload.tenantId || payload.orderData?.tenantId;
      const orderData = payload.orderData || payload;
      const qrMenuId = payload.qrMenuId || orderData.qrMenuId;
      const tableNumber = orderData.tableNumber || payload.tableNumber || "01";
      const customerNotes = orderData.notes || payload.notes || "";
      const rawItems = orderData.items || payload.items || [];

      if (!tenantId) {
        return reply.code(400).send({ success: false, message: "Tenant ID diperlukan." });
      }

      if (!rawItems || rawItems.length === 0) {
        return reply.code(400).send({ success: false, message: "Keranjang pesanan kosong." });
      }

      // Resolve Outlet & Warehouse
      let outletId = payload.outletId;
      if (!outletId && qrMenuId) {
        const qr = await prisma.qrMenu.findUnique({ where: { id: qrMenuId } });
        if (qr) outletId = qr.outletId;
      }
      if (!outletId) {
        const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
        outletId = outlet?.id;
      }

      if (!outletId) {
        return reply.code(400).send({ success: false, message: "Outlet tidak ditemukan." });
      }

      // Fetch menus to calculate true prices
      const itemIds = rawItems.map((i: any) => i.id || i.productId || i.menuId);
      const menus = await prisma.menu.findMany({
        where: { id: { in: itemIds }, tenantId },
      });
      const menuMap = new Map(menus.map((m) => [m.id, m]));

      let subtotal = 0;
      const orderItems: Array<{
        menuId: string;
        name: string;
        quantity: number;
        price: number;
        total: number;
        note: string;
      }> = [];

      for (const it of rawItems) {
        const mId = it.id || it.productId || it.menuId;
        const menu = menuMap.get(mId);
        const qty = Number(it.quantity) || 1;
        const price = menu ? menu.price : 0;
        const lineTotal = price * qty;
        subtotal += lineTotal;

        orderItems.push({
          menuId: mId,
          name: menu?.name || it.name || "Menu",
          quantity: qty,
          price,
          total: lineTotal,
          note: it.notes || it.note || "",
        });
      }

      const invoiceNumber = `TBL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

      // Create SalesHeader with UNPAID / PENDING status for cashier confirmation
      const sale = await prisma.salesHeader.create({
        data: {
          tenantId,
          outletId,
          invoiceNumber,
          businessDate: new Date(),
          cashierId: "table-self-order",
          subtotal,
          discount: 0,
          tax: 0,
          serviceCharge: 0,
          totalAmount: subtotal,
          status: "PENDING",
          note: `Self-Order Meja ${tableNumber}${customerNotes ? ` (${customerNotes})` : ""}`,
          details: {
            create: orderItems.map((oi) => ({
              menuId: oi.menuId,
              menuNameSnapshot: oi.name,
              quantity: oi.quantity,
              unitPriceSnapshot: oi.price,
              totalPrice: oi.total,
            })),
          },
        },
      });

      // Create KitchenOrder and broadcast live to KDS
      const kitchenOrder = await prisma.kitchenOrder.create({
        data: {
          salesId: sale.id,
          outletId,
          orderNumber: `T${tableNumber}-${sale.invoiceNumber.slice(-4)}`,
          status: "NEW",
          items: JSON.stringify(
            orderItems.map((oi) => ({
              name: oi.name,
              quantity: oi.quantity,
              notes: oi.note,
            })),
          ),
        },
      });

      // Live broadcast to barista KDS
      broadcastKitchenEvent(outletId, {
        type: "NEW_ORDER",
        order: {
          id: kitchenOrder.id,
          orderNumber: kitchenOrder.orderNumber,
          status: "NEW",
          tableNumber,
          items: orderItems.map((oi) => ({
            name: oi.name,
            quantity: oi.quantity,
            notes: oi.note,
          })),
        },
      });

      return reply.code(201).send({
        success: true,
        orderId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        totalAmount: sale.totalAmount,
        tableNumber,
        order: {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          totalAmount: sale.totalAmount,
          tableNumber,
          status: "PENDING",
          items: orderItems,
        },
        message: "Pesanan meja berhasil dikirim ke kasir & kitchen!",
      });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  fastify.post("/table-public/checkout", handleTableCheckout);
  fastify.post("/orders/table-public/checkout", handleTableCheckout);

  // Bulk Generate Tables
  const handleGenerateTables = async (request: any, reply: any) => {
    try {
      const tenantId =
        (request.headers["x-tenant-id"] as string) ||
        request.sessionContext?.tenantId;
      const { count = 10, outletId: reqOutletId } = (request.body as any) || {};

      if (!tenantId) {
        return reply.code(400).send({ success: false, message: "Tenant ID diperlukan." });
      }

      const outlet = reqOutletId
        ? await prisma.outlet.findUnique({ where: { id: reqOutletId } })
        : await prisma.outlet.findFirst({ where: { tenantId } });

      if (!outlet) {
        return reply.code(404).send({ success: false, message: "Outlet tidak ditemukan." });
      }

      const numTables = Math.min(Math.max(1, Number(count)), 100);

      // Clean existing tables for this outlet
      await prisma.qrMenu.deleteMany({
        where: { tenantId, outletId: outlet.id },
      });

      const newTables = [];
      const tenantPrefix = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase();
      for (let i = 1; i <= numTables; i++) {
        const pad = String(i).padStart(2, "0");
        const slug = `meja-${pad}-${tenantPrefix}`;
        newTables.push({
          tenantId,
          outletId: outlet.id,
          slug,
          menuData: JSON.stringify({ tableNumber: pad, name: `Meja ${pad}` }),
        });
      }

      await prisma.qrMenu.createMany({
        data: newTables,
      });

      const createdTables = await prisma.qrMenu.findMany({
        where: { tenantId, outletId: outlet.id },
        orderBy: { slug: "asc" },
      });

      return reply.code(200).send({
        success: true,
        message: `Sukses mendaftarkan ${createdTables.length} meja baru ke database!`,
        tables: createdTables.map((t, idx) => ({
          id: t.id,
          name: `Meja ${String(idx + 1).padStart(2, "0")}`,
          slug: t.slug,
          qrUrl: `/table/${t.slug}`,
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  fastify.post("/tables/generate", handleGenerateTables);
  fastify.post("/orders/tables/generate", handleGenerateTables);

  // Cashier confirms table order payment
  const handleConfirmPayment = async (request: any, reply: any) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const sale = await prisma.salesHeader.findFirst({
        where: {
          OR: [{ id: orderId }, { invoiceNumber: orderId }],
        },
        include: { kitchenOrder: true },
      });

      if (!sale) {
        return reply.code(404).send({ success: false, message: "Pesanan tidak ditemukan." });
      }

      const updated = await prisma.salesHeader.update({
        where: { id: sale.id },
        data: { status: "POSTED" },
      });

      if (sale.kitchenOrder) {
        await prisma.kitchenOrder.update({
          where: { id: sale.kitchenOrder.id },
          data: { status: "IN_PROGRESS" },
        });

        broadcastKitchenEvent(sale.outletId, {
          type: "STATUS_UPDATE",
          order: {
            id: sale.kitchenOrder.id,
            status: "IN_PROGRESS",
          },
        });
      }

      return reply.code(200).send({
        success: true,
        status: "PAID",
        sale: updated,
      });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  fastify.post("/orders/:orderId/confirm-payment", handleConfirmPayment);
  fastify.post("/:orderId/confirm-payment", handleConfirmPayment);
}
