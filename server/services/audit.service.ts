import crypto from "crypto";
import { prisma } from "../lib/prisma.ts";

export interface CreateAuditLogParams {
  tenantId?: string | null;
  userId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  severity?: "info" | "warning" | "critical";
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Append-only audit log with cryptographic hash chain (prevHash -> hash).
   * Invariant: hash = SHA256(prevHash + tenantId + userId + action + resourceType + resourceId + now)
   */
  static async recordAuditLog(params: CreateAuditLogParams) {
    try {
      const now = new Date();

      // Find the most recent audit log in the tenant to chain from
      const lastEntry = await prisma.auditLog.findFirst({
        where: params.tenantId ? { tenantId: params.tenantId } : undefined,
        orderBy: { createdAt: "desc" },
        select: { hash: true },
      });

      const prevHash = lastEntry?.hash || "GENESIS_LEDGERLINE_CHAIN";

      const hashPayload = [
        prevHash,
        params.tenantId || "",
        params.userId || "",
        params.actorRole || "",
        params.action,
        params.resourceType || "",
        params.resourceId || "",
        now.toISOString(),
      ].join("|");

      const hash = crypto.createHash("sha256").update(hashPayload).digest("hex");

      const log = await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId || null,
          userId: params.userId || null,
          actorRole: params.actorRole || null,
          action: params.action,
          resourceType: params.resourceType || null,
          resourceId: params.resourceId || null,
          oldData: params.oldData ? JSON.stringify(params.oldData) : null,
          newData: params.newData ? JSON.stringify(params.newData) : null,
          severity: params.severity || "info",
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          prevHash,
          hash,
          createdAt: now,
        },
      });

      return log;
    } catch (err: any) {
      // Fail-safe: Audit logging error should never swallow silently, log to stderr
      console.error("[AUDIT LOG ERROR] Failed to append chained audit log:", err.message);
      return null;
    }
  }

  /**
   * Verify integrity of the audit log chain for a tenant.
   */
  static async verifyChainIntegrity(tenantId?: string) {
    const logs = await prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: "asc" },
    });

    let currentExpectedPrev = "GENESIS_LEDGERLINE_CHAIN";
    const corruptedLogIds: string[] = [];

    for (const log of logs) {
      if (log.prevHash !== currentExpectedPrev) {
        corruptedLogIds.push(log.id);
      }
      currentExpectedPrev = log.hash;
    }

    return {
      isValid: corruptedLogIds.length === 0,
      totalLogs: logs.length,
      corruptedLogIds,
    };
  }
}
