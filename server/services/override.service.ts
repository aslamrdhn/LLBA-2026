import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.ts";
import { AuditService } from "./audit.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";

export type ManagerOverrideActionType =
  | "VOID"
  | "REFUND"
  | "DISCOUNT_OVERRIDE"
  | "OPEN_DRAWER"
  | "PRICE_OVERRIDE";

export interface VerifyManagerOverrideParams {
  tenantId: string;
  cashierUserId: string;
  cashierRole: string;
  actionType: ManagerOverrideActionType;
  entityId: string;
  reason: string;
  managerPin: string;
  deviceId?: string | null;
  outletId?: string | null;
}

export interface VerifyManagerOverrideResult {
  success: true;
  authorizedBy: string;
  managerUserId: string;
  managerRole: string;
  overrideToken: string;
}

// In-memory rate limiting and lockout state per device / tenant
interface AttemptRecord {
  attempts: number;
  firstAttemptAt: number;
  consecutiveFailures: number;
  lockedUntil: number | null;
}

const deviceAttempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CONSECUTIVE_FAILURES = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class OverrideService {
  /**
   * Helper to get rate-limiting key for device + tenant
   */
  private static getRateLimitKey(tenantId: string, deviceId?: string | null): string {
    return `${tenantId}:${deviceId || "default-pos-device"}`;
  }

  /**
   * Check rate-limiting and device lockout status
   */
  public static checkRateLimit(tenantId: string, deviceId?: string | null): void {
    const key = this.getRateLimitKey(tenantId, deviceId);
    const now = Date.now();
    const record = deviceAttempts.get(key);

    if (!record) return;

    // Check if device is in lockout
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      throw new LedgerError(
        `AUT_006`,
        `Perangkat terkunci karena salah PIN berulang kali. Coba lagi dalam ${remainingMinutes} menit.`,
        403,
      );
    }

    // Reset window if expired
    if (now - record.firstAttemptAt > WINDOW_DURATION_MS) {
      deviceAttempts.delete(key);
      return;
    }

    // Check attempt limit
    if (record.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
      throw new LedgerError(
        `AUT_006`,
        `Batas percobaan Manager Override terlampaui (maksimal 5 kali per 15 menit). Silakan tunggu.`,
        429,
      );
    }
  }

  /**
   * Record a failed attempt and apply lockout if consecutive failures >= 3
   */
  public static recordFailedAttempt(tenantId: string, deviceId?: string | null): void {
    const key = this.getRateLimitKey(tenantId, deviceId);
    const now = Date.now();
    const record = deviceAttempts.get(key) || {
      attempts: 0,
      firstAttemptAt: now,
      consecutiveFailures: 0,
      lockedUntil: null,
    };

    record.attempts += 1;
    record.consecutiveFailures += 1;

    if (record.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
    }

    deviceAttempts.set(key, record);
  }

  /**
   * Record a successful attempt: resets consecutive failures
   */
  public static recordSuccess(tenantId: string, deviceId?: string | null): void {
    const key = this.getRateLimitKey(tenantId, deviceId);
    const record = deviceAttempts.get(key);
    if (record) {
      record.consecutiveFailures = 0;
      record.lockedUntil = null;
    }
  }

  /**
   * Reset rate limit (for testing or manager manual unlock)
   */
  public static resetRateLimit(tenantId: string, deviceId?: string | null): void {
    const key = this.getRateLimitKey(tenantId, deviceId);
    deviceAttempts.delete(key);
  }

  /**
   * Verifies a single-action Manager Override PIN at POS (§2.4, §8.14)
   */
  public static async verifyManagerOverride(
    params: VerifyManagerOverrideParams,
  ): Promise<VerifyManagerOverrideResult> {
    const {
      tenantId,
      cashierUserId,
      cashierRole,
      actionType,
      entityId,
      reason,
      managerPin,
      deviceId,
      outletId,
    } = params;

    // 1. Validate action type (§2.4 rule 4)
    const allowedActions: ManagerOverrideActionType[] = [
      "VOID",
      "REFUND",
      "DISCOUNT_OVERRIDE",
      "OPEN_DRAWER",
      "PRICE_OVERRIDE",
    ];

    if (!allowedActions.includes(actionType)) {
      throw new LedgerError(
        "AUT_002",
        `Aksi override '${actionType}' tidak diizinkan melalui jalur PIN Manager. Aksi berisiko tinggi memerlukan TOTP Owner.`,
        403,
      );
    }

    if (!reason || reason.trim().length < 3) {
      throw new LedgerError(
        "VAL_001",
        "Alasan override wajib diisi dengan jelas (minimal 3 karakter).",
        400,
      );
    }

    // 2. Check rate limit & lockout
    this.checkRateLimit(tenantId, deviceId);

    // 3. Find active Manager or Owner users in this tenant
    const managers = await prisma.userProfile.findMany({
      where: {
        tenantId,
        role: { in: ["MANAGER", "OWNER"] },
        status: "active",
      },
    });

    if (managers.length === 0) {
      this.recordFailedAttempt(tenantId, deviceId);
      throw new LedgerError(
        "AUT_006",
        "Tidak ada akun Manager atau Owner aktif yang terdaftar pada tenant ini.",
        403,
      );
    }

    // 4. Verify PIN against managers' metadata.managerPinHash or pinHash
    let verifiedManager: (typeof managers)[0] | null = null;

    for (const manager of managers) {
      // Check if manager account is locked
      if (manager.pinLockedUntil && manager.pinLockedUntil > new Date()) {
        continue;
      }

      let managerPinHash: string | null = null;
      if (manager.metadata) {
        try {
          const meta = JSON.parse(manager.metadata);
          managerPinHash = meta.managerPinHash || null;
        } catch {}
      }

      const hashToCompare = managerPinHash || manager.pinHash;
      if (hashToCompare) {
        const matches = await bcrypt.compare(managerPin, hashToCompare);
        if (matches) {
          verifiedManager = manager;
          break;
        }
      }
    }

    if (!verifiedManager) {
      this.recordFailedAttempt(tenantId, deviceId);
      throw new LedgerError(
        "AUT_006",
        "Manager Override PIN salah atau tidak memiliki otorisasi.",
        403,
      );
    }

    // 5. Successful verification: reset device consecutive failures
    this.recordSuccess(tenantId, deviceId);

    // Reset pinAttempts on manager record if needed
    if (verifiedManager.pinAttempts > 0) {
      await prisma.userProfile.update({
        where: { id: verifiedManager.id },
        data: { pinAttempts: 0, pinLockedUntil: null },
      });
    }

    // 6. Generate single-use cryptographic override token
    const tokenPayload = `${tenantId}:${verifiedManager.id}:${actionType}:${entityId}:${Date.now()}`;
    const overrideToken = crypto.createHash("sha256").update(tokenPayload).digest("hex");

    // 7. Record immutable AuditLog (§2.4 rule 7)
    await AuditService.recordAuditLog({
      tenantId,
      userId: verifiedManager.userId || verifiedManager.id,
      actorRole: verifiedManager.role, // 'MANAGER' or 'OWNER'
      action: "MANAGER_OVERRIDE",
      resourceType: actionType,
      resourceId: entityId,
      severity: "warning",
      metadata: {
        sessionUser: cashierRole, // e.g. 'CASHIER'
        cashierUserId,
        overrideUsed: true,
        actionType,
        entityId,
        reason,
        outletId: outletId || null,
        deviceId: deviceId || null,
        overrideToken,
      },
    });

    return {
      success: true,
      authorizedBy: verifiedManager.fullName || verifiedManager.role,
      managerUserId: verifiedManager.userId || verifiedManager.id,
      managerRole: verifiedManager.role,
      overrideToken,
    };
  }

  /**
   * Set Manager Override PIN for a user (§2.4 rule 2)
   * Only callable by OWNER role with TOTP verification if required
   */
  public static async setManagerPin(
    targetUserId: string,
    tenantId: string,
    newPin: string,
  ): Promise<void> {
    if (!newPin || newPin.length < 4 || newPin.length > 8) {
      throw new LedgerError(
        "VAL_001",
        "PIN Manager harus berupa angka antara 4 hingga 8 digit.",
        400,
      );
    }

    const user = await prisma.userProfile.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!user) {
      throw new LedgerError("NOT_FOUND", "Pengguna tidak ditemukan pada tenant ini.", 404);
    }

    if (!["MANAGER", "OWNER"].includes(user.role)) {
      throw new LedgerError(
        "AUT_002",
        "Hanya pengguna dengan peran MANAGER atau OWNER yang dapat memiliki Manager Override PIN.",
        403,
      );
    }

    const managerPinHash = await bcrypt.hash(newPin, 10);
    let meta: Record<string, any> = {};
    if (user.metadata) {
      try {
        meta = JSON.parse(user.metadata);
      } catch {}
    }
    meta.managerPinHash = managerPinHash;

    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        metadata: JSON.stringify(meta),
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });
  }
}
