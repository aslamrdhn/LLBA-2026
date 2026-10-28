import { FastifyRequest, FastifyReply } from "fastify";
import { SessionService } from "../../services/session.service.ts";
import { AuditService } from "../../services/audit.service.ts";

export interface GuardOptions {
  roles?: string[];
  requireOutlet?: boolean;
  auditAction?: string;
}

// Augment FastifyRequest to include session context
declare module "fastify" {
  interface FastifyRequest {
    sessionContext?: {
      session: any;
      user: any;
      tenantId: string | null;
      outletId: string | null;
      role: string;
    };
  }
}

export function extractSessionToken(request: FastifyRequest): string | null {
  // 1. Try reading from HttpOnly cookie
  if (request.cookies && request.cookies.ll_session) {
    return request.cookies.ll_session;
  }

  // 2. Fallback to Authorization: Bearer <token> (for POS/mobile clients)
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export function guard(options: GuardOptions = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractSessionToken(request);

    if (!token) {
      return reply.code(401).send({
        success: false,
        error: "UNAUTHORIZED",
        message: "Sesi login tidak ditemukan atau kedaluwarsa. Silakan masuk kembali.",
      });
    }

    const session = await SessionService.validateSession(token);

    if (!session) {
      return reply.code(401).send({
        success: false,
        error: "INVALID_SESSION",
        message: "Sesi tidak valid atau telah dicabut.",
      });
    }

    const user = session.userProfile;
    const role = (user.role || "").toUpperCase();

    // MANDATORY ANTI-SPOOFING RULE:
    // tenantId, outletId, and user are read EXCLUSIVELY from the verified server session,
    // NEVER from headers (e.g. x-tenant-id), URL queries, or request body.
    request.sessionContext = {
      session,
      user,
      tenantId: session.tenantId,
      outletId: session.outletId,
      role,
    };

    // Role-based Access Control
    if (options.roles && options.roles.length > 0) {
      const allowedRoles = options.roles.map((r) => r.toUpperCase());
      const isSuperAdmin = role === "SUPER_ADMIN";

      if (!isSuperAdmin && !allowedRoles.includes(role)) {
        return reply.code(403).send({
          success: false,
          error: "FORBIDDEN",
          message: `Peran '${role}' tidak memiliki izin untuk mengakses sumber daya ini.`,
        });
      }
    }

    // Outlet verification
    if (options.requireOutlet) {
      if (!session.outletId) {
        return reply.code(400).send({
          success: false,
          error: "OUTLET_REQUIRED",
          message: "Silakan pilih outlet aktif terlebih dahulu sebelum melanjutkan transaksi.",
        });
      }

      const isPrivileged = role === "SUPER_ADMIN" || role === "OWNER";
      const hasOutletAssigned = user.userOutlets.some(
        (uo: any) => uo.outletId === session.outletId,
      );

      if (!isPrivileged && !hasOutletAssigned) {
        return reply.code(403).send({
          success: false,
          error: "OUTLET_ACCESS_DENIED",
          message: "Anda tidak memiliki akses ke outlet ini.",
        });
      }
    }

    // Audit Logging if requested
    if (options.auditAction) {
      await AuditService.recordAuditLog({
        tenantId: session.tenantId,
        userId: user.userId,
        actorRole: role,
        action: options.auditAction,
        resourceType: request.routeOptions.url,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        metadata: {
          method: request.method,
          url: request.url,
        },
      });
    }
  };
}
