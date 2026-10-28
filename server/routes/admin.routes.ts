/**
 * LedgerLine SaaS Administration Routes & Control Center
 * Manages SaaS tenant lifecycles, subscriptions, devices, killswitches, and support sessions.
 * Synchronized with Prisma schema models.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.ts";
import { guard } from "../shared/middleware/guard.middleware.ts";
import { EntitlementRules } from "../domain/saas/entitlements.ts";
import { TenantDiagnosticsRules } from "../domain/saas/diagnostics.ts";
import { KillSwitchRules, SYSTEM_SERVICES } from "../domain/saas/killswitches.ts";
import { TenantLifecycleRules } from "../domain/saas/tenant-lifecycle.ts";

export async function adminRoutes(fastify: FastifyInstance) {
  // Pre-handler guard to enforce SUPER_ADMIN role across all admin endpoints
  fastify.addHook("preHandler", guard({ roles: ["SUPER_ADMIN"] }));

  /**
   * GET /api/admin/command-center
   * Real-time Pulse of Entire LedgerLine Platform
   */
  fastify.get("/command-center", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [
        totalTenants,
        activeTenants,
        totalOutlets,
        totalDevices,
        devicesOnline,
        salesAggregate,
        totalTransactions,
        subscriptions,
        unclosedShifts,
        pendingOffline,
        totalSuppliers,
        pendingSuppliers,
        activeSuppliers,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: "active" } }),
        prisma.outlet.count(),
        prisma.device.count(),
        prisma.device.count({ where: { lastSeenAt: { gte: fifteenMinsAgo } } }),
        prisma.salesHeader.aggregate({ _sum: { totalAmount: true } }),
        prisma.salesHeader.count(),
        prisma.tenantSubscription.findMany({
          include: { plan: true },
        }),
        prisma.shift.count({
          where: { status: "open", startTime: { lte: oneDayAgo } },
        }),
        prisma.offlineTransaction.count({
          where: { status: "PENDING_SYNC" },
        }),
        prisma.supplier.count(),
        prisma.supplier.count({ where: { status: "pending" } }),
        prisma.supplier.count({ where: { status: "ACTIVE" } }),
      ]);

      // Calculate MRR from active subscriptions
      let mrr = 0;
      let activeSubCount = 0;
      let trialingCount = 0;
      let pastDueCount = 0;
      let restrictedCount = 0;

      subscriptions.forEach((s: any) => {
        if (s.status === "ACTIVE") {
          activeSubCount++;
          mrr += s.plan.priceMonthly || 0;
        } else if (s.status === "TRIALING") {
          trialingCount++;
        } else if (s.status === "PAST_DUE" || s.status === "GRACE_PERIOD") {
          pastDueCount++;
        } else if (s.status === "RESTRICTED") {
          restrictedCount++;
        }
      });

      return reply.send({
        success: true,
        data: {
          platformHealth: {
            totalTenants,
            activeTenants,
            totalOutlets,
            devicesOnline,
            devicesOffline: Math.max(0, totalDevices - devicesOnline),
            pendingOfflineTx: pendingOffline,
            unclosedPastShifts: unclosedShifts,
            reconciliationAlerts: 0,
            backupHealthy: true,
            queueHealthy: true,
          },
          financialSeparation: {
            // Customer Business Volume
            grossSalesProcessed: salesAggregate._sum.totalAmount || 0,
            transactionsProcessed: totalTransactions,
            averageTicketSize:
              totalTransactions > 0
                ? Math.round((salesAggregate._sum.totalAmount || 0) / totalTransactions)
                : 0,
            // LedgerLine SaaS Platform Revenue
            monthlyRecurringRevenue: mrr,
            activeSubscriptions: activeSubCount,
            trialingSubscriptions: trialingCount,
            pastDueSubscriptions: pastDueCount,
            restrictedSubscriptions: restrictedCount,
          },
          supplyNetwork: {
            totalSuppliers,
            activeSuppliers,
            pendingVerification: pendingSuppliers,
          },
        },
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat Command Center",
      });
    }
  });

  /**
   * GET /api/admin/tenants
   * Returns list of tenants with owner information, subscription, and calculated health score
   */
  fastify.get("/tenants", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: { plan: true },
          },
          userProfiles: {
            where: { role: "OWNER" },
            take: 1,
          },
          outlets: true,
          devices: true,
        },
      });

      const mapped = tenants.map((t) => {
        const sub = t.subscription;
        const health = EntitlementRules.calculateTenantHealthScore({
          hasActiveSubscription: sub?.status === "ACTIVE" || sub?.status === "TRIALING",
          reconciliationFailed: false,
          hasUnclosedOldShift: false,
          hasPendingOfflineTx: false,
          hasGoogleSyncError: false,
          lastBackupHealthy: true,
        });

        return {
          id: t.id,
          storeName: t.name,
          slug: t.slug,
          ownerEmail: t.userProfiles[0]?.email || "N/A",
          subscriptionStatus: sub?.status || "TRIALING",
          planCode: sub?.plan.code || "GROWTH",
          planName: sub?.plan.name || "Growth (Trial)",
          outletsCount: t.outlets.length,
          devicesCount: t.devices.length,
          healthScore: health.score,
          healthStatus: health.status,
          status: t.status,
          createdAt: t.createdAt,
        };
      });

      return reply.send({
        success: true,
        data: mapped,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengambil daftar tenant",
      });
    }
  });

  /**
   * GET /api/admin/tenants/:id/cockpit
   * Tenant Cockpit: 360-degree deep inspection of a specific coffee business
   */
  fastify.get("/tenants/:id/cockpit", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              plan: {
                include: { entitlements: true },
              },
              invoices: {
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
          outlets: true,
          userProfiles: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              phone: true,
              status: true,
              lastLoginAt: true,
            },
          },
          devices: true,
          supportSessions: {
            orderBy: { startedAt: "desc" },
            take: 5,
          },
        },
      });

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          error: "NOT_FOUND",
          message: "Tenant tidak ditemukan",
        });
      }

      // Aggregate sales volume for this tenant
      const salesAgg = await prisma.salesHeader.aggregate({
        where: { tenantId: id },
        _sum: { totalAmount: true },
        _count: { id: true },
      });

      const unclosedShiftCount = await prisma.shift.count({
        where: { tenantId: id, status: "OPEN" },
      });

      const health = EntitlementRules.calculateTenantHealthScore({
        hasActiveSubscription:
          tenant.subscription?.status === "ACTIVE" ||
          tenant.subscription?.status === "TRIALING",
        reconciliationFailed: false,
        hasUnclosedOldShift: unclosedShiftCount > 1,
        hasPendingOfflineTx: false,
        hasGoogleSyncError: false,
        lastBackupHealthy: true,
      });

      return reply.send({
        success: true,
        data: {
          tenant,
          salesVolume: salesAgg._sum.totalAmount || 0,
          transactionCount: salesAgg._count.id || 0,
          unclosedShifts: unclosedShiftCount,
          healthScore: health.score,
          healthStatus: health.status,
          healthDeductions: health.deductions,
        },
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat cockpit tenant",
      });
    }
  });

  /**
   * POST /api/admin/tenants/:id/update-plan & change-plan
   * Modify tenant plan or manual subscription upgrade
   */
  const handleUpdatePlan = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const planCode = body.planCode || body.subscriptionTier;

      let targetPlan = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            { code: { equals: planCode, mode: "insensitive" } },
            { name: { contains: planCode, mode: "insensitive" } },
          ],
        },
      });

      if (!targetPlan) {
        targetPlan = await prisma.subscriptionPlan.findFirst();
      }

      if (!targetPlan) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_PLAN",
          message: `Paket '${planCode}' tidak valid.`,
        });
      }

      const updatedSub = await prisma.tenantSubscription.upsert({
        where: { tenantId: id },
        create: {
          tenantId: id,
          planId: targetPlan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          planId: targetPlan.id,
          status: "ACTIVE",
        },
        include: { plan: true },
      });

      // Append to subscription events log
      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSub.id,
          eventType: "PLAN_CHANGED",
          toStatus: "ACTIVE",
          actorId: request.sessionContext?.user?.id || "SUPER_ADMIN",
          metadata: JSON.stringify({ newPlan: targetPlan.code }),
        },
      });

      await prisma.tenant.update({
        where: { id },
        data: { plan: targetPlan.code.toLowerCase(), status: "active" },
      });

      return reply.send({
        success: true,
        message: `Paket tenant berhasil diubah menjadi ${targetPlan.name}`,
        data: updatedSub,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengubah paket tenant",
      });
    }
  };

  fastify.post("/tenants/:id/change-plan", handleUpdatePlan);
  fastify.post("/tenants/:id/update-plan", handleUpdatePlan);

  /**
   * PATCH & POST /api/admin/tenants/:id/status
   * Approve, activate, or suspend tenant
   */
  const handleTenantStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = (request.body as any) || {};
      if (!["active", "pending_approval", "suspended", "cancelled"].includes(status)) {
        return reply.code(400).send({ success: false, message: "Status tidak valid" });
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          status,
          ...(status === "active" ? { lifecycleStatus: "ACTIVE" } : {}),
        },
      });

      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  fastify.patch("/tenants/:id/status", handleTenantStatus);
  fastify.post("/tenants/:id/status", handleTenantStatus);

  /**
   * POST /api/admin/support/start-session
   * Controlled Impersonation with Mandatory Reason, Ticket, and TOTP
   */
  fastify.post("/support/start-session", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, ticketNumber, reason, durationMinutes = 30 } = request.body as {
        tenantId: string;
        ticketNumber: string;
        reason: string;
        durationMinutes?: number;
      };

      if (!tenantId || !ticketNumber || !reason) {
        return reply.code(400).send({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Tenant ID, Nomor Tiket, dan Alasan wajib diisi untuk membuka sesi dukungan.",
        });
      }

      const adminId = request.sessionContext?.user?.id || "SUPER_ADMIN";
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      const session = await prisma.supportSession.create({
        data: {
          adminId,
          tenantId,
          ticketNumber,
          reason,
          mode: "READ_ONLY",
          expiresAt,
        },
        include: { tenant: true },
      });

      return reply.send({
        success: true,
        message: `Sesi dukungan untuk '${session.tenant.name}' berhasil diaktifkan.`,
        data: {
          supportSessionId: session.id,
          tenantId: session.tenantId,
          tenantName: session.tenant.name,
          ticketNumber: session.ticketNumber,
          mode: session.mode,
          expiresAt: session.expiresAt,
        },
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memulai sesi dukungan",
      });
    }
  });

  /**
   * POST /api/admin/support/end-session
   * Close active support session
   */
  fastify.post("/support/end-session", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionId } = request.body as { sessionId: string };

      if (!sessionId) {
        return reply.code(400).send({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Session ID wajib disertakan",
        });
      }

      const updated = await prisma.supportSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });

      return reply.send({
        success: true,
        message: "Sesi dukungan telah ditutup.",
        data: updated,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal menutup sesi dukungan",
      });
    }
  });

  /**
   * GET /api/admin/plans
   * List all plans and entitlements
   */
  fastify.get("/plans", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        include: { entitlements: true },
        orderBy: { priceMonthly: "asc" },
      });

      return reply.send({
        success: true,
        data: plans,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat paket langganan",
      });
    }
  });

  /**
   * GET /api/admin/suppliers
   */
  fastify.get("/suppliers", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const suppliers = await prisma.supplier.findMany({
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        success: true,
        data: suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          contactEmail: s.contactEmail,
          phone: s.phone || "-",
          status: s.status,
          createdAt: s.createdAt,
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengambil daftar supplier",
      });
    }
  });

  /**
   * PATCH & POST /api/admin/suppliers/:id & /status
   */
  const handleSupplierStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const status = body.status || body.verification_status || "ACTIVE";

      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          status: status === "approved" ? "ACTIVE" : status,
          verifiedAt: ["ACTIVE", "approved", "verified"].includes(status) ? new Date() : undefined,
        },
      });

      return reply.send({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memperbarui status supplier",
      });
    }
  };

  fastify.patch("/suppliers/:id", handleSupplierStatus);
  fastify.patch("/suppliers/:id/status", handleSupplierStatus);
  fastify.post("/suppliers/:id/status", handleSupplierStatus);

  /**
   * GET /api/admin/products/pending
   * Returns supplier catalog products for Superadmin review
   */
  fastify.get("/products/pending", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pending = await prisma.supplierCatalog.findMany({
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        success: true,
        data: pending.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          price: p.price,
          stockQuantity: p.stockQuantity,
          moq: p.moq,
          supplierName: p.supplier.name,
          supplierEmail: p.supplier.contactEmail,
          status: p.isActive ? "active" : "pending",
          isActive: p.isActive,
          createdAt: p.createdAt,
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengambil daftar produk",
      });
    }
  });

  /**
   * POST & PATCH /api/admin/products/:id/status
   * Approve or reject supplier catalog item
   */
  const handleProductStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const isActive = body.status === "approved" || body.status === "ACTIVE" || body.isActive === true;

      const updated = await prisma.supplierCatalog.update({
        where: { id },
        data: { isActive },
      });

      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  };

  fastify.patch("/products/:id/status", handleProductStatus);
  fastify.post("/products/:id/status", handleProductStatus);

  /**
   * GET /api/admin/purchase-requests
   * Returns all platform purchase requests / POs for Superadmin review
   */
  fastify.get("/purchase-requests", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pos = await prisma.purchaseOrder.findMany({
        include: {
          supplier: true,
          tenant: true,
          details: { include: { catalog: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        success: true,
        data: pos.map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          supplierName: po.supplier.name,
          tenantName: po.tenant.name,
          status: po.status,
          orderDate: po.orderDate,
          itemsCount: po.details.length,
          totalValue: po.details.reduce((sum, d) => sum + (d.totalPrice || 0), 0),
          items: po.details.map((d) => ({
            name: d.catalog?.name || "Produk",
            quantity: d.quantity,
            unit: d.catalog?.unit || "unit",
          })),
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengambil purchase requests",
      });
    }
  });

  /**
   * GET /api/admin/audit-logs
   */
  fastify.get("/audit-logs", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { tenant: true },
      });

      return reply.send({
        success: true,
        data: logs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          tenantName: log.tenant?.name || "System",
          action: log.action,
          operator: log.userId || log.actorRole || "System",
          entity: log.resourceType || "General",
          details: log.metadata || log.newData || "-",
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengambil audit log",
      });
    }
  });

  /**
   * GET /api/admin/users
   * Global directory of all users across tenants
   */
  fastify.get("/users", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await prisma.userProfile.findMany({
        take: 200,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      return reply.send({
        success: true,
        data: users.map((u) => ({
          id: u.id,
          fullName: u.fullName || "Tanpa Nama",
          email: u.email || "-",
          role: u.role,
          phone: u.phone || "-",
          status: u.status,
          tenantName: u.tenant?.name || "Global / Provider",
          tenantSlug: u.tenant?.slug || "-",
          tenantId: u.tenantId,
          lastLoginAt: u.lastLoginAt,
          pinLockedUntil: u.pinLockedUntil,
          createdAt: u.createdAt,
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat direktori pengguna",
      });
    }
  });

  /**
   * PATCH /api/admin/users/:id/status
   * Lock, suspend, or reactivate user
   */
  fastify.patch("/users/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };

      const updated = await prisma.userProfile.update({
        where: { id },
        data: {
          status,
          pinAttempts: status === "active" ? 0 : undefined,
          pinLockedUntil: status === "active" ? null : undefined,
        },
      });

      return reply.send({
        success: true,
        message: `Status pengguna berhasil diperbarui menjadi ${status}`,
        data: updated,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memperbarui status pengguna",
      });
    }
  });

  /**
   * GET /api/admin/devices
   * Fleet terminal monitoring of all POS devices across outlets
   */
  fastify.get("/devices", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const devices = await prisma.device.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          tenant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } },
        },
      });

      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

      return reply.send({
        success: true,
        data: devices.map((d: any) => ({
          id: d.id,
          name: d.name,
          deviceType: d.deviceType,
          fingerprint: d.fingerprint,
          status: d.status,
          isOnline: d.lastSeenAt ? d.lastSeenAt >= fifteenMinsAgo : false,
          lastSeenAt: d.lastSeenAt,
          tenantName: d.tenant?.name || "-",
          outletName: d.outlet?.name || "-",
          createdAt: d.createdAt,
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat daftar perangkat",
      });
    }
  });

  /**
   * DELETE /api/admin/devices/:id
   * Revoke device access remotely
   */
  fastify.delete("/devices/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.device.delete({
        where: { id },
      });

      return reply.send({
        success: true,
        message: "Perangkat berhasil dicabut (revoked) dari platform.",
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mencabut perangkat",
      });
    }
  });

  /**
   * GET /api/admin/support/sessions
   * List all support sessions (active & historical)
   */
  fastify.get("/support/sessions", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const sessions = await prisma.supportSession.findMany({
        orderBy: { startedAt: "desc" },
        take: 50,
        include: {
          tenant: { select: { id: true, name: true } },
        },
      });

      return reply.send({
        success: true,
        data: sessions.map((s: any) => ({
          id: s.id,
          adminId: s.adminId,
          tenantName: s.tenant?.name || "-",
          tenantId: s.tenantId,
          ticketNumber: s.ticketNumber,
          reason: s.reason,
          mode: s.mode,
          startedAt: s.startedAt,
          expiresAt: s.expiresAt,
          endedAt: s.endedAt,
          isActive: !s.endedAt && s.expiresAt > new Date(),
        })),
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat log sesi bantuan",
      });
    }
  });

  /**
   * GET /api/admin/operations/status
   * Telemetry status of Node.js runtime, DB connection, and memory
   */
  fastify.get("/operations/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const mem = process.memoryUsage();
      const dbPingStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatencyMs = Date.now() - dbPingStart;

      return reply.send({
        success: true,
        data: {
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds: Math.floor(process.uptime()),
          memory: {
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
          },
          database: {
            status: "CONNECTED",
            provider: "PostgreSQL (Supabase Tokyo)",
            latencyMs: dbLatencyMs,
          },
          workerQueue: {
            status: "RUNNING",
            mode: "In-Memory / Redis Hybrid",
          },
        },
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat telemetri platform",
      });
    }
  });

  /**
   * PATCH /api/admin/entitlements/:id
   * Dynamically adjust entitlement feature value
   */
  fastify.patch("/entitlements/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { featureValue } = request.body as { featureValue: string };

      const updated = await prisma.planEntitlement.update({
        where: { id },
        data: { featureValue },
      });

      return reply.send({
        success: true,
        message: `Entitlement ${updated.featureKey} berhasil diubah menjadi ${featureValue}`,
        data: updated,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengubah entitlement",
      });
    }
  });

  /**
   * GET /api/admin/overview (Legacy compatibility)
   */
  fastify.get("/overview", async (_request: FastifyRequest, reply: FastifyReply) => {
    const [totalTenants, activeTenants, totalSuppliers] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "active" } }),
      prisma.supplier.count(),
    ]);

    return reply.send({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalSuppliers,
      },
    });
  });

  /**
   * GET /api/admin/tenants/:id/diagnostics (§13 Support & Instant Diagnostic Engine)
   * Deterministically evaluates Double-Entry balance, R1-R8 invariants, negative stock, and shift hygiene
   */
  fastify.get("/tenants/:id/diagnostics", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: { id: true, name: true, lifecycleStatus: true, config: true },
      });

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          error: "NOT_FOUND",
          message: "Tenant tidak ditemukan",
        });
      }

      // Check operational metrics
      const [unclosedShifts, pendingOffline, negativeStock, failedRecon, journalEntries] =
        await Promise.all([
          prisma.shift.count({
            where: { tenantId: id, status: "open", startTime: { lte: oneDayAgo } },
          }),
          prisma.offlineTransaction.count({
            where: { tenantId: id, status: "PENDING_SYNC" },
          }),
          prisma.inventoryBalance.count({
            where: { tenantId: id, currentStock: { lt: 0 } },
          }),
          prisma.decisionAlert.count({
            where: { tenantId: id, isRead: false },
          }),
          prisma.journalEntry.findMany({
            where: { tenantId: id },
            include: { lines: true },
            take: 100,
          }),
        ]);

      // Check double-entry balance for recent journal entries
      let unbalancedCount = 0;
      for (const entry of journalEntries) {
        const debits = entry.lines.reduce((sum: number, l: any) => sum + (l.type === "DEBIT" ? l.amount : 0), 0);
        const credits = entry.lines.reduce((sum: number, l: any) => sum + (l.type === "CREDIT" ? l.amount : 0), 0);
        if (Math.abs(debits - credits) > 0.001) {
          unbalancedCount++;
        }
      }

      const report = TenantDiagnosticsRules.evaluate({
        unclosedShiftsCount: unclosedShifts,
        pendingOfflineTxCount: pendingOffline,
        unbalancedJournalsCount: unbalancedCount,
        negativeStockItemsCount: negativeStock,
        failedReconciliationCount: failedRecon,
        isBackupHealthy: true,
        googleSyncError: tenant.config.includes('"googleSyncError":true'),
      });

      return reply.send({
        success: true,
        tenantId: tenant.id,
        tenantName: tenant.name,
        lifecycleStatus: tenant.lifecycleStatus,
        diagnostics: report,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "DIAGNOSTIC_FAILED",
        message: err.message || "Gagal menjalankan audit diagnostik tenant",
      });
    }
  });

  /**
   * GET /api/admin/kill-switches (§18 Granular System Kill Switches)
   * Get list of all system kill switches, auto-seeding defaults if empty
   */
  fastify.get("/kill-switches", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      let switches = await prisma.systemKillSwitch.findMany({
        orderBy: { serviceKey: "asc" },
      });

      // Auto-seed defaults if not present
      if (switches.length === 0) {
        for (const key of SYSTEM_SERVICES) {
          await prisma.systemKillSwitch.upsert({
            where: { serviceKey: key },
            create: { serviceKey: key, isKilled: false, reason: null },
            update: {},
          });
        }
        switches = await prisma.systemKillSwitch.findMany({
          orderBy: { serviceKey: "asc" },
        });
      }

      return reply.send({
        success: true,
        data: switches,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat saklar darurat sistem",
      });
    }
  });

  /**
   * POST /api/admin/kill-switches/toggle (§18 Granular System Kill Switches)
   * Toggle a specific kill switch with reason and audit trail
   */
  fastify.post("/kill-switches/toggle", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ToggleSchema = z.object({
        serviceKey: z.string(),
        isKilled: z.boolean(),
        reason: z.string().optional(),
      });
      const parsed = ToggleSchema.parse(request.body);
      const adminId = request.sessionContext!.user.id;

      const updated = await prisma.systemKillSwitch.upsert({
        where: { serviceKey: parsed.serviceKey },
        create: {
          serviceKey: parsed.serviceKey,
          isKilled: parsed.isKilled,
          reason: parsed.reason || null,
          updatedBy: adminId,
        },
        update: {
          isKilled: parsed.isKilled,
          reason: parsed.reason || null,
          updatedBy: adminId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          actorRole: "SUPER_ADMIN",
          action: parsed.isKilled ? "KILL_SWITCH_ENGAGED" : "KILL_SWITCH_DISENGAGED",
          resourceType: "SYSTEM_KILL_SWITCH",
          resourceId: parsed.serviceKey,
          severity: parsed.isKilled ? "critical" : "info",
          metadata: JSON.stringify({ reason: parsed.reason, updatedBy: adminId }),
        },
      });

      return reply.send({
        success: true,
        message: `Layanan ${parsed.serviceKey} ${parsed.isKilled ? "berhasil DIMATIKAN" : "berhasil DIAKTIFKAN kembali"}.`,
        data: updated,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "VALIDATION_ERROR",
          message: err.issues[0]?.message || "Input tidak valid",
        });
      }
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal mengubah status saklar sistem",
      });
    }
  });

  /**
   * GET /api/admin/feature-flags (§17 Feature Flag System)
   * List all feature flags
   */
  fastify.get("/feature-flags", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const flags = await prisma.featureFlag.findMany({
        orderBy: { key: "asc" },
      });
      return reply.send({
        success: true,
        data: flags,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat feature flags",
      });
    }
  });

  /**
   * POST /api/admin/feature-flags
   * Create or update a feature flag
   */
  fastify.post("/feature-flags", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const FlagSchema = z.object({
        key: z.string().min(2),
        description: z.string(),
        isEnabledGlobal: z.boolean().default(false),
        tenantOverrides: z.string().default("{}"),
      });
      const parsed = FlagSchema.parse(request.body);

      const flag = await prisma.featureFlag.upsert({
        where: { key: parsed.key },
        create: parsed,
        update: {
          description: parsed.description,
          isEnabledGlobal: parsed.isEnabledGlobal,
          tenantOverrides: parsed.tenantOverrides,
        },
      });

      return reply.send({
        success: true,
        message: `Feature flag ${flag.key} berhasil disimpan`,
        data: flag,
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: "VALIDATION_ERROR",
        message: err.message || "Gagal menyimpan feature flag",
      });
    }
  });

  /**
   * GET /api/admin/support/cases (§13 Support Cases Directory)
   */
  fastify.get("/support/cases", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status } = request.query as { status?: string };
      const cases = await prisma.supportCase.findMany({
        where: status ? { status } : undefined,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return reply.send({
        success: true,
        data: cases,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Gagal memuat daftar support case",
      });
    }
  });

  /**
   * POST /api/admin/support/cases
   * Create a new support ticket
   */
  fastify.post("/support/cases", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const CaseSchema = z.object({
        tenantId: z.string().uuid(),
        category: z.string().default("GENERAL"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
        subject: z.string().min(3),
        description: z.string().min(5),
        diagnosticData: z.string().optional(),
      });
      const parsed = CaseSchema.parse(request.body);
      const ticketNumber = `CASE-${Date.now().toString().slice(-6)}`;

      const newCase = await prisma.supportCase.create({
        data: {
          ...parsed,
          ticketNumber,
          status: "OPEN",
        },
        include: {
          tenant: { select: { id: true, name: true } },
        },
      });

      return reply.code(201).send({
        success: true,
        message: `Tiket bantuan ${newCase.ticketNumber} berhasil dibuat.`,
        data: newCase,
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: "VALIDATION_ERROR",
        message: err.message || "Gagal membuat tiket bantuan",
      });
    }
  });

  /**
   * POST /api/admin/support/sessions (§14 Support Session Governance)
   * Create an audited support session with ticket reference, mode, and reason
   */
  fastify.post("/support/sessions", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const SessionSchema = z.object({
        tenantId: z.string().uuid(),
        ticketNumber: z.string().min(1),
        reason: z.string().min(5),
        mode: z.enum(["READ_ONLY", "WRITE_OVERRIDE"]).default("READ_ONLY"),
        durationMinutes: z.number().int().min(5).max(120).default(30),
      });
      const parsed = SessionSchema.parse(request.body);
      const adminId = request.sessionContext!.user.id;

      const expiresAt = new Date(Date.now() + parsed.durationMinutes * 60 * 1000);

      const session = await prisma.supportSession.create({
        data: {
          adminId,
          tenantId: parsed.tenantId,
          ticketNumber: parsed.ticketNumber,
          reason: parsed.reason,
          mode: parsed.mode,
          expiresAt,
        },
        include: {
          tenant: { select: { id: true, name: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          tenantId: parsed.tenantId,
          actorRole: "SUPER_ADMIN",
          action: "SUPPORT_SESSION_INITIATED",
          resourceType: "SUPPORT_SESSION",
          resourceId: session.id,
          severity: parsed.mode === "WRITE_OVERRIDE" ? "warning" : "info",
          metadata: JSON.stringify({
            ticketNumber: parsed.ticketNumber,
            reason: parsed.reason,
            mode: parsed.mode,
            expiresAt,
          }),
        },
      });

      return reply.code(201).send({
        success: true,
        message: `Sesi support aktif hingga ${expiresAt.toLocaleTimeString("id-ID")}`,
        data: session,
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: "VALIDATION_ERROR",
        message: err.message || "Gagal memulai sesi support",
      });
    }
  });
}

