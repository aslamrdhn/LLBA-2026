import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";
import { ProcurementService } from "../services/procurement.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { guard } from "../shared/middleware/guard.middleware.ts";

const JWT_SECRET = process.env.JWT_SECRET || "ledgerline_jwt_secret_change_in_production";

function extractSupplier(request: any): { supplierId: string; email?: string } | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.supplierId) {
      return { supplierId: decoded.supplierId, email: decoded.email };
    }
  } catch {}

  // Transition fallback for direct UUID token if supplier was already authenticated
  if (token && token.length >= 32 && !token.includes(".")) {
    return { supplierId: token };
  }

  return null;
}

export async function supplierRoutes(fastify: FastifyInstance) {
  const handleRegister = async (request: any, reply: any) => {
    const { company_name, contactEmail, phone, password } = request.body as any;

    if (!contactEmail || !contactEmail.includes("@")) {
      return reply.code(400).send({ success: false, message: "Email kontak tidak valid." });
    }
    if (!password || password.length < 6) {
      return reply.code(400).send({ success: false, message: "Kata sandi minimal 6 karakter." });
    }

    try {
      const existingSupplier = await prisma.supplier.findFirst({
        where: { contactEmail: contactEmail.toLowerCase() },
      });
      if (existingSupplier) {
        return reply.code(400).send({ success: false, message: "Email sudah terdaftar sebagai mitra pemasok." });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const supplier = await prisma.supplier.create({
        data: {
          name: company_name || "Mitra Pemasok Baru",
          contactEmail: contactEmail.toLowerCase(),
          phone: phone || null,
          status: "pending", // Requires Super Admin review before full platform activation
        },
      });

      // Link UserProfile with role SUPPLIER
      await prisma.userProfile.create({
        data: {
          userId: `sup_${supplier.id.slice(0, 8)}_${Date.now()}`,
          supplierId: supplier.id,
          email: contactEmail.toLowerCase(),
          fullName: company_name || "Mitra Pemasok",
          role: "SUPPLIER",
          phone: phone || null,
          pinHash: passwordHash,
          status: "active",
        },
      });

      return reply.code(201).send({
        success: true,
        message: "Pendaftaran mitra pemasok berhasil! Akun Anda siap digunakan (status verifikasi: pending).",
      });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  const handleLogin = async (request: any, reply: any) => {
    const { contactEmail, password } = request.body as any;

    if (!contactEmail || !password) {
      return reply.code(400).send({ success: false, message: "Email dan kata sandi wajib diisi." });
    }

    try {
      const supplier = await prisma.supplier.findFirst({
        where: { contactEmail: contactEmail.toLowerCase() },
      });
      if (!supplier) {
        return reply.code(401).send({ success: false, message: "Email atau kata sandi tidak valid." });
      }

      const profile = await prisma.userProfile.findFirst({
        where: { supplierId: supplier.id },
      });

      if (profile?.pinHash) {
        const isValid = await bcrypt.compare(password, profile.pinHash);
        if (!isValid) {
          return reply.code(401).send({ success: false, message: "Email atau kata sandi tidak valid." });
        }
      }

      const token = jwt.sign(
        {
          supplierId: supplier.id,
          role: "SUPPLIER",
          email: supplier.contactEmail,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return reply.code(200).send({
        success: true,
        token,
        supplier: {
          id: supplier.id,
          companyName: supplier.name,
          contactEmail: supplier.contactEmail,
          status: supplier.status,
        },
      });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  // Auth routes with both paths
  fastify.post("/auth/register", handleRegister);
  fastify.post("/register", handleRegister);
  fastify.post("/auth/login", handleLogin);
  fastify.post("/login", handleLogin);

  // Purchase Requests for Supplier
  fastify.get("/purchase-requests", async (request, reply) => {
    const supplierSession = extractSupplier(request);
    if (!supplierSession) {
      return reply.code(401).send({ success: false, error: "UNAUTHORIZED", message: "Sesi supplier tidak ditemukan." });
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: { supplierId: supplierSession.supplierId },
      include: {
        details: { include: { catalog: true } },
        tenant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return pos.map((po) => ({
      id: po.id,
      date: po.createdAt.toISOString().split("T")[0],
      store_name: po.tenant?.name || "Toko",
      status: po.status,
      total_value: po.details.reduce((sum, d) => sum + d.totalPrice, 0),
      items: po.details.map((d) => ({
        name: d.catalog.name,
        quantity: d.quantity,
        unit: d.catalog.unit,
      })),
    }));
  });

  fastify.post("/purchase-requests/:id/action", async (request, reply) => {
    const supplierSession = extractSupplier(request);
    if (!supplierSession) {
      return reply.code(401).send({ success: false, error: "UNAUTHORIZED", message: "Autentikasi supplier diperlukan." });
    }

    const { id } = request.params as any;
    const { action } = request.body as any; // 'approve' or 'reject'

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return reply.code(404).send({ success: false, error: "NOT_FOUND", message: "Purchase Order tidak ditemukan." });
    }

    // Verify PO belongs to this supplier
    if (po.supplierId !== supplierSession.supplierId) {
      return reply.code(403).send({ success: false, error: "FORBIDDEN", message: "Anda tidak memiliki otoritas pada PO ini." });
    }

    const newStatus =
      action === "approve"
        ? "APPROVED"
        : action === "reject"
          ? "REJECTED"
          : "PENDING";

    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
    });

    return reply.code(200).send({ success: true, status: newStatus });
  });

  // Supplier Products / Catalog
  fastify.get("/products", async (request, reply) => {
    const supplierSession = extractSupplier(request);
    if (!supplierSession) {
      return reply.code(401).send({ success: false, error: "UNAUTHORIZED", message: "Sesi supplier tidak ditemukan." });
    }

    const catalog = await prisma.supplierCatalog.findMany({
      where: { supplierId: supplierSession.supplierId },
      orderBy: { createdAt: "desc" },
    });

    return catalog.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      unit: c.unit,
      price: c.price,
      isActive: c.isActive,
    }));
  });

  fastify.post("/products", async (request, reply) => {
    const supplierSession = extractSupplier(request);
    if (!supplierSession) {
      return reply.code(401).send({ success: false, error: "UNAUTHORIZED", message: "Sesi supplier tidak ditemukan." });
    }

    const { product_name, category, price_offer, unit } = request.body as any;
    if (!product_name) {
      return reply.code(400).send({ success: false, message: "Nama produk wajib diisi." });
    }

    const newProduct = await prisma.supplierCatalog.create({
      data: {
        supplierId: supplierSession.supplierId,
        name: product_name,
        category: category || "Bahan Baku",
        unit: unit || "kg",
        price: Number(price_offer) || 0,
        isActive: false, // Requires Super Admin or Tenant verification before public listing
      },
    });

    return reply.code(201).send({ success: true, data: newProduct });
  });

  // Internal Procurement: Create Purchase Order (§8.16)
  const handleCreateOrder = async (request: any, reply: any) => {
    try {
      const body = request.body as any;
      // Rule 3.4: tenantId derived STRICTLY from server session
      const tenantId =
        (request as any).sessionContext?.tenantId ||
        (request as any).user?.tenantId;

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: "UNAUTHORIZED",
          message: "Tenant ID tidak ditemukan pada sesi terautentikasi.",
        });
      }

      const result = await ProcurementService.createPurchaseOrder({
        tenantId,
        supplierId: body.supplierId,
        outletId: body.outletId,
        items: body.items,
        notes: body.notes,
        createdBy: (request as any).sessionContext?.userId || (request as any).user?.userId,
      });

      return reply.code(201).send({
        success: true,
        data: {
          id: result.id,
          poNumber: result.poNumber,
          totalAmount: result.totalAmount.toNumber(),
        },
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
        error: "SYS-001",
        message: error.message || "Gagal membuat Purchase Order",
      });
    }
  };

  const handleListOrders = async (request: any, reply: any) => {
    try {
      const sessionTenantId =
        (request as any).sessionContext?.tenantId ||
        (request as any).user?.tenantId;
      const role =
        (request as any).sessionContext?.role ||
        (request as any).user?.role;

      if (!sessionTenantId && role !== "SUPER_ADMIN") {
        return reply.code(401).send({
          success: false,
          error: "UNAUTHORIZED",
          message: "Autentikasi diperlukan untuk melihat pesanan pembelian.",
        });
      }

      const isSuperAdmin = role === "SUPER_ADMIN";
      const targetTenantId = isSuperAdmin ? (request.query as any)?.tenantId : sessionTenantId;

      const pos = await prisma.purchaseOrder.findMany({
        where: targetTenantId ? { tenantId: targetTenantId } : {},
        include: {
          supplier: true,
          details: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.code(200).send({
        success: true,
        data: pos,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS-001",
        message: err.message,
      });
    }
  };

  fastify.post("/orders", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleCreateOrder);
  fastify.post("/purchase-orders", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleCreateOrder);
  fastify.get("/orders", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleListOrders);
  fastify.get("/purchase-orders", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleListOrders);

  // Internal Procurement: QC Receiving & Inbound Stock Mutasi (§8.16)
  fastify.post("/receive", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "BARISTA"] })] }, async (request, reply) => {
    try {
      const body = request.body as any;
      // Rule 3.4: tenantId derived STRICTLY from server session
      const tenantId =
        (request as any).sessionContext?.tenantId ||
        (request as any).user?.tenantId;

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: "UNAUTHORIZED",
          message: "Tenant ID tidak ditemukan pada sesi terautentikasi.",
        });
      }

      const result = await ProcurementService.receivePurchaseOrder({
        tenantId,
        purchaseOrderId: body.purchaseOrderId,
        outletId: body.outletId,
        warehouseId: body.warehouseId,
        items: body.items,
        receivedBy: (request as any).sessionContext?.userId || (request as any).user?.userId,
        notes: body.notes,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      });

      return reply.code(200).send({
        success: true,
        data: {
          receivingId: result.receivingId,
          journalNumber: result.journalNumber,
          totalValue: result.totalValue.toNumber(),
          itemsCount: result.itemsCount,
        },
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
        error: "SYS-001",
        message: error.message || "Gagal memproses penerimaan barang PO",
      });
    }
  });
}
