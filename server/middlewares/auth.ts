import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, JwtPayload } from "../utils/jwt.ts";
import { prisma } from "../lib/prisma.ts";
import { SessionService } from "../services/session.service.ts";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload & { role?: string; assignedOutlets?: string[] };
    sessionContext?: {
      session: any;
      user: any;
      tenantId: string | null;
      outletId: string | null;
      role: string;
    };
  }
}

/**
 * Middleware to authenticate JWT token or server Session cookie.
 * Populates request.user with minimal claims (userId, tenantId).
 */
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // 1. Check HttpOnly session cookie first
    if (request.cookies && request.cookies.ll_session) {
      const session = await SessionService.validateSession(request.cookies.ll_session);
      if (session) {
        let parsedOutlets: string[] = ["*"];
        try {
          if (session.userProfile.assignedOutlets) {
            parsedOutlets = JSON.parse(session.userProfile.assignedOutlets);
          }
        } catch {}

        request.user = {
          userId: session.userProfile.userId,
          tenantId: session.tenantId || undefined,
          role: session.userProfile.role,
          assignedOutlets: parsedOutlets,
        };
        request.sessionContext = {
          session,
          user: session.userProfile,
          tenantId: session.tenantId,
          outletId: session.outletId,
          role: (session.userProfile.role || "").toUpperCase(),
        };
        return;
      }
    }

    // 2. Check Authorization Bearer header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply
        .code(401)
        .send({
          error: "UNAUTHORIZED",
          message: "Missing or invalid authorization header or session",
        });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    request.user = decoded;
  } catch (error) {
    return reply
      .code(401)
      .send({ error: "UNAUTHORIZED", message: "Token invalid or expired" });
  }
}

/**
 * Middleware to enforce tenant boundary.
 * Ensures the user has a tenantId and enriches request.user with role/assignedOutlets.
 */
export async function enforceTenantBoundary(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user || !request.user.tenantId) {
    return reply
      .code(403)
      .send({ error: "FORBIDDEN", message: "Tenant context required" });
  }

  // Fetch role and assignedOutlets from DB (could be cached in Redis per ADR-081)
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: request.user.userId },
    select: { role: true, assignedOutlets: true, status: true },
  });

  if (!userProfile || userProfile.status !== "active") {
    return reply
      .code(403)
      .send({ error: "FORBIDDEN", message: "User inactive or not found" });
  }

  request.user.role = userProfile.role;
  request.user.assignedOutlets = userProfile.assignedOutlets
    ? JSON.parse(userProfile.assignedOutlets)
    : [];
}

/**
 * Validates if the user has access to a specific outlet.
 * Usually used inside specific route handlers or as a preHandler.
 */
export function crossOutletValidation(
  outletId: string,
  assignedOutlets?: string[],
): boolean {
  if (!assignedOutlets || assignedOutlets.length === 0) return false;
  return assignedOutlets.includes("*") || assignedOutlets.includes(outletId);
}
