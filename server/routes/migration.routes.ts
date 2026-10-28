import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.ts";
import { MigrationService } from "../services/migration.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { guard } from "../shared/middleware/guard.middleware.ts";

export async function migrationRoutes(fastify: FastifyInstance) {
  // Helper to ensure at least one sample migration request exists for demo/testing
  const ensureSampleRequest = async (tenantId?: string) => {
    try {
      const count = await prisma.migrationJob.count();
      if (count === 0 && tenantId) {
        await prisma.migrationJob.create({
          data: {
            tenantId,
            sourceSystem: "Moka POS",
            fileUrl: "export_menu_moka.csv",
            status: "WAITING_FILE",
            validationErrors: "Permintaan migrasi katalog produk dari Moka POS.",
          },
        });
      }
    } catch (e) {
      console.warn("Could not seed initial migration job:", e);
    }
  };

  // GET /requests or GET /
  const getRequestsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionTenantId = (request as any).sessionContext?.tenantId || (request as any).user?.tenantId;
    const role = (request as any).sessionContext?.role || (request as any).user?.role;

    if (sessionTenantId) {
      await ensureSampleRequest(sessionTenantId);
    }

    try {
      const isSuperAdmin = role === "SUPER_ADMIN";
      const jobs = await prisma.migrationJob.findMany({
        where: isSuperAdmin ? {} : sessionTenantId ? { tenantId: sessionTenantId } : { id: "__none__" },
        include: {
          tenant: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formatted = jobs.map((job) => ({
        id: job.id,
        tenantId: job.tenantId,
        tenant: {
          id: job.tenant?.id || job.tenantId,
          name: job.tenant?.name || "Store",
          storeName: job.tenant?.name || "Store",
        },
        previousPos: job.sourceSystem || "Moka POS",
        status: (job.status || "PENDING").toUpperCase(),
        files: job.fileUrl
          ? [
              {
                name: job.fileUrl.split("/").pop() || "export_data.csv",
                url: job.fileUrl,
              },
            ]
          : [],
        notes: job.validationErrors || "",
        createdAt: job.createdAt.toISOString(),
      }));

      return reply.send(formatted);
    } catch (error: any) {
      console.error("Error fetching migration requests:", error);
      return reply.send([]);
    }
  };

  fastify.get("/requests", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, getRequestsHandler);
  fastify.get("/", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, getRequestsHandler);

  // PATCH or POST /requests/:id/status
  const updateStatusHandler = async (
    request: any,
    reply: FastifyReply,
  ) => {
    const { id } = (request.params as any) || {};
    const { status } = (request.body as any) || {};
    const sessionTenantId = (request as any).sessionContext?.tenantId || (request as any).user?.tenantId;
    const role = (request as any).sessionContext?.role || (request as any).user?.role;

    if (!status) {
      return reply.status(400).send({ success: false, error: "Status is required" });
    }

    try {
      const existing = await prisma.migrationJob.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: "Migration job not found" });
      }

      if (role !== "SUPER_ADMIN" && existing.tenantId !== sessionTenantId) {
        return reply.status(403).send({ success: false, error: "FORBIDDEN", message: "Akses ditolak ke tiket migrasi ini" });
      }

      const updated = await prisma.migrationJob.update({
        where: { id },
        data: {
          status: status.toUpperCase(),
        },
      });
      return reply.send({ success: true, request: updated });
    } catch (error: any) {
      console.error(`Error updating migration request ${id}:`, error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  };

  fastify.patch("/requests/:id/status", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER"] })] }, updateStatusHandler);
  fastify.post("/requests/:id/status", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER"] })] }, updateStatusHandler);

  // POST /requests/:id/import
  fastify.post(
    "/requests/:id/import",
    { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER"] })] },
    async (
      request: any,
      reply: FastifyReply,
    ) => {
      const { id } = (request.params as any) || {};
      const { mappedProducts } = (request.body as any) || {};
      const sessionTenantId = (request as any).sessionContext?.tenantId || (request as any).user?.tenantId;
      const role = (request as any).sessionContext?.role || (request as any).user?.role;

      if (!mappedProducts || !Array.isArray(mappedProducts)) {
        return reply
          .status(400)
          .send({ success: false, error: "mappedProducts array is required" });
      }

      try {
        const job = await prisma.migrationJob.findUnique({ where: { id } });
        if (!job) {
          return reply.status(404).send({ success: false, error: "Tiket migrasi tidak ditemukan" });
        }

        if (role !== "SUPER_ADMIN" && job.tenantId !== sessionTenantId) {
          return reply.status(403).send({ success: false, error: "FORBIDDEN", message: "Akses ditolak ke tenant ini" });
        }

        const targetTenantId = job.tenantId;

        let importedCount = 0;
        for (const item of mappedProducts) {
          if (!item.name) continue;
          await prisma.menu.create({
            data: {
              tenantId: targetTenantId,
              name: item.name,
              category: item.category || "General",
              price: Number(item.price) || 0,
              isActive: true,
            },
          });
          importedCount++;
        }

        await prisma.migrationJob.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        return reply.send({
          success: true,
          imported: importedCount,
          message: `Berhasil mengimpor ${importedCount} produk ke database.`,
        });
      } catch (error: any) {
        console.error(`Error importing migration data for ${id}:`, error);
        return reply.status(500).send({ success: false, error: error.message });
      }
    },
  );

  /**
   * POST /api/migration/opening-balance (§8.17)
   * Ingest initial raw material inventory balance with formula sanitization and double-entry equity posting.
   */
  const handleOpeningBalance = async (request: FastifyRequest, reply: FastifyReply) => {
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

      const result = await MigrationService.importOpeningBalance({
        tenantId,
        warehouseId: body.warehouseId,
        items: body.items,
        openingDate: body.openingDate ? new Date(body.openingDate) : new Date(),
        notes: body.notes,
      });

      return reply.code(201).send({
        success: true,
        data: {
          importedCount: result.importedCount,
          totalOpeningValue: result.totalOpeningValue.toNumber(),
          journalNumber: result.journalNumber,
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
        message: error.message || "Gagal mengimpor saldo awal persediaan",
      });
    }
  };

  fastify.post("/opening-balance", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER"] })] }, handleOpeningBalance);
  fastify.post("/import-opening-balance", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER"] })] }, handleOpeningBalance);

  // Tenant Ticket Creation
  const handleCreateTicket = async (
    request: any,
    reply: FastifyReply,
  ) => {
    try {
      const body = (request.body as any) || {};
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

      const ticket = await prisma.migrationJob.create({
        data: {
          tenantId,
          sourceSystem: body.notes ? String(body.notes).slice(0, 100) : "Customer Upload",
          fileUrl: body.fileName || "data_export.csv",
          status: "PENDING",
          validationErrors: body.notes || "",
        },
      });

      return reply.send({ success: true, ticketId: ticket.id, data: ticket });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  };

  fastify.post("/tenant/migration-tickets", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleCreateTicket);
  fastify.post("/tickets", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleCreateTicket);
  fastify.post("/migration-tickets", { preHandler: [guard({ roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] })] }, handleCreateTicket);
  fastify.get("/admin/migration-tickets", { preHandler: [guard({ roles: ["SUPER_ADMIN"] })] }, getRequestsHandler);
  fastify.post("/admin/migration-tickets/:id", { preHandler: [guard({ roles: ["SUPER_ADMIN"] })] }, updateStatusHandler);
  fastify.patch("/admin/migration-tickets/:id", { preHandler: [guard({ roles: ["SUPER_ADMIN"] })] }, updateStatusHandler);
}

