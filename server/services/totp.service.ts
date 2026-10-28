import { prisma } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import bcrypt from "bcryptjs";
import {
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
  generateOtpauthUri,
  generateBackupCodes,
} from "../domain/auth/totp.ts";

export interface TotpEnrollmentResult {
  secret: string;
  otpauthUri: string;
  backupCodes: string[];
}

export interface TotpMetadata {
  enabled: boolean;
  secret: string;
  pendingSecret?: string;
  pendingBackupCodes?: string[];
  backupCodes: string[];
  lastUsedStep: number;
  enrolledAt?: string;
}

export class TotpService {
  /**
   * Start enrollment for user
   */
  static async startEnrollment(
    userId: string,
    tenantId: string,
  ): Promise<TotpEnrollmentResult> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: { tenant: true },
    });

    if (!profile) {
      throw new LedgerError("AUT-001", "User profile tidak ditemukan.");
    }

    let meta: Record<string, any> = {};
    try {
      meta = profile.metadata ? JSON.parse(profile.metadata) : {};
    } catch {
      meta = {};
    }

    const secret = generateTotpSecret(20);
    const { plainCodes, hashedCodes } = await generateBackupCodes(8);
    const issuer = profile.tenant?.name || "LedgerLine by Aslam";
    const accountName = profile.email || profile.fullName || userId;
    const otpauthUri = generateOtpauthUri({ accountName, issuer, secret });

    const totpMeta: TotpMetadata = {
      enabled: false,
      secret: "",
      pendingSecret: secret,
      pendingBackupCodes: hashedCodes,
      backupCodes: [],
      lastUsedStep: -1,
    };

    meta.totp = totpMeta;

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { metadata: JSON.stringify(meta) },
    });

    return {
      secret,
      otpauthUri,
      backupCodes: plainCodes,
    };
  }

  /**
   * Confirm enrollment with first valid 6-digit token
   */
  static async confirmEnrollment(
    userId: string,
    token: string,
  ): Promise<{ success: boolean }> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new LedgerError("AUT-001", "User profile tidak ditemukan.");
    }

    let meta: Record<string, any> = {};
    try {
      meta = profile.metadata ? JSON.parse(profile.metadata) : {};
    } catch {
      meta = {};
    }

    const totp = meta.totp as TotpMetadata | undefined;
    if (!totp || !totp.pendingSecret) {
      throw new LedgerError("VAL-001", "Pendaftaran TOTP belum dimulai atau sudah selesai.");
    }

    const verify = verifyTotpToken(token, totp.pendingSecret);
    if (!verify.valid) {
      throw new LedgerError("AUT-005", "Kode verifikasi TOTP salah atau kedaluwarsa.");
    }

    totp.enabled = true;
    totp.secret = totp.pendingSecret;
    totp.backupCodes = totp.pendingBackupCodes || [];
    totp.lastUsedStep = verify.matchedStep || Math.floor(Date.now() / 1000 / 30);
    totp.enrolledAt = new Date().toISOString();
    delete totp.pendingSecret;
    delete totp.pendingBackupCodes;

    meta.totp = totp;

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { metadata: JSON.stringify(meta) },
    });

    return { success: true };
  }

  /**
   * Verify TOTP token or single-use backup code for critical enterprise actions (A14)
   */
  static async verifyCode(
    userId: string,
    codeOrToken: string,
  ): Promise<{ valid: boolean; usedBackupCode?: boolean }> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new LedgerError("AUT-001", "User profile tidak ditemukan.");
    }

    let meta: Record<string, any> = {};
    try {
      meta = profile.metadata ? JSON.parse(profile.metadata) : {};
    } catch {
      meta = {};
    }

    const totp = meta.totp as TotpMetadata | undefined;
    if (!totp || !totp.enabled || !totp.secret) {
      throw new LedgerError("AUT-005", "Akun ini belum mengaktifkan autentikasi 2 faktor (TOTP).");
    }

    const cleaned = codeOrToken.trim();

    // 1. Try 6-digit TOTP
    if (/^\d{6}$/.test(cleaned)) {
      const verify = verifyTotpToken(cleaned, totp.secret, {
        lastUsedStep: totp.lastUsedStep,
      });

      if (verify.valid) {
        // Prevent replay attacks (A14 single use)
        totp.lastUsedStep = verify.matchedStep!;
        meta.totp = totp;
        await prisma.userProfile.update({
          where: { id: profile.id },
          data: { metadata: JSON.stringify(meta) },
        });
        return { valid: true, usedBackupCode: false };
      }
    }

    // 2. Try Emergency Backup Code
    if (totp.backupCodes && totp.backupCodes.length > 0) {
      for (let i = 0; i < totp.backupCodes.length; i++) {
        const hash = totp.backupCodes[i];
        const isMatch = await bcrypt.compare(cleaned, hash);
        if (isMatch) {
          // Consume the backup code (single-use)
          totp.backupCodes.splice(i, 1);
          meta.totp = totp;
          await prisma.userProfile.update({
            where: { id: profile.id },
            data: { metadata: JSON.stringify(meta) },
          });
          return { valid: true, usedBackupCode: true };
        }
      }
    }

    return { valid: false };
  }
}
