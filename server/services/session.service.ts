import crypto from "crypto";
import { prisma } from "../lib/prisma.ts";

export class SessionService {
  /**
   * Hashes token using SHA-256 before database lookup / persistence
   */
  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate a cryptographically secure random session token
   */
  static generateRawToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Creates an active server-side session.
   * Session expires in 7 days by default.
   */
  static async createSession(
    userId: string,
    tenantId?: string | null,
    outletId?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    const rawToken = this.generateRawToken();
    const sessionTokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        sessionTokenHash,
        userId,
        tenantId: tenantId || null,
        outletId: outletId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt,
      },
      include: {
        userProfile: {
          include: {
            userOutlets: {
              include: { outlet: true },
            },
            tenant: true,
          },
        },
        outlet: true,
      },
    });

    return { rawToken, session };
  }

  /**
   * Validates session token and returns active session with user & tenant details
   */
  static async validateSession(rawToken: string) {
    if (!rawToken || typeof rawToken !== "string") {
      return null;
    }

    const sessionTokenHash = this.hashToken(rawToken);

    const session = await prisma.session.findUnique({
      where: { sessionTokenHash },
      include: {
        userProfile: {
          include: {
            userOutlets: {
              include: { outlet: true },
            },
            tenant: true,
          },
        },
        outlet: true,
        tenant: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check expiration and revocation
    if (session.revokedAt !== null || session.expiresAt <= new Date()) {
      return null;
    }

    // Check user active status
    if (session.userProfile.status !== "active") {
      return null;
    }

    return session;
  }

  /**
   * Revoke session on logout
   */
  static async revokeSession(rawToken: string) {
    if (!rawToken) return false;
    const sessionTokenHash = this.hashToken(rawToken);

    try {
      await prisma.session.update({
        where: { sessionTokenHash },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Switch the active outlet for the session
   */
  static async switchOutlet(rawToken: string, targetOutletId: string) {
    const session = await this.validateSession(rawToken);
    if (!session) {
      throw new Error("Sesi tidak valid");
    }

    const user = session.userProfile;
    // SUPER_ADMIN and OWNER can access any outlet in the tenant
    const isOwnerOrSuper = user.role === "SUPER_ADMIN" || user.role === "OWNER";
    const hasAssignedOutlet = user.userOutlets.some(
      (uo) => uo.outletId === targetOutletId,
    );

    if (!isOwnerOrSuper && !hasAssignedOutlet) {
      throw new Error("Akses ditolak: Anda tidak ditugaskan pada outlet ini");
    }

    const sessionTokenHash = this.hashToken(rawToken);
    const updated = await prisma.session.update({
      where: { sessionTokenHash },
      data: { outletId: targetOutletId },
      include: {
        outlet: true,
      },
    });

    return updated;
  }
}
