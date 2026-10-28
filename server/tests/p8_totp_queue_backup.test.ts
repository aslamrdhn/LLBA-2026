process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { prisma } from "../lib/prisma.ts";
import { authRoutes } from "../routes/auth.routes.ts";
import { financeRoutes } from "../routes/finance.routes.ts";
import { SessionService } from "../services/session.service.ts";
import {
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
  generateBackupCodes,
  base32Encode,
  base32Decode,
} from "../domain/auth/totp.ts";
import { TotpService } from "../services/totp.service.ts";
import { BackupService } from "../services/backup.service.ts";

describe("Fase 8, 9, 10: Enterprise 2FA TOTP, Period Closing Lock, & Backup Invariants (§2.2, §18 A14, A15)", () => {
  let app: any;
  let tenant: any;
  let ownerUser: any;
  let ownerSessionToken: string;

  before(async () => {
    app = Fastify({ logger: false });
    await app.register(cookie, {
      secret: "test_secret_for_cookie_32_characters_long!",
    });
    await app.register(authRoutes, { prefix: "/api/auth" });
    await app.register(financeRoutes, { prefix: "/api/finance" });

    // 1. Create Isolated Tenant
    const uniqueSlug = `p8-enterprise-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: "Enterprise Roastworks",
        slug: uniqueSlug,
        plan: "enterprise",
        status: "active",
        timezone: "Asia/Jakarta",
      },
    });

    // 2. Create Owner UserProfile
    ownerUser = await prisma.userProfile.create({
      data: {
        userId: `owner-uid-${Date.now()}`,
        tenantId: tenant.id,
        role: "OWNER",
        email: `owner-${Date.now()}@roastworks.com`,
        fullName: "Owner Enterprise",
        status: "active",
      },
    });

    // 3. Create Session
    const sessionResult = await SessionService.createSession(
      ownerUser.id,
      tenant.id,
      null,
      "OWNER",
    );
    ownerSessionToken = sessionResult.rawToken;
  });

  after(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  describe("1. Pure RFC 6238 TOTP Engine", () => {
    it("Harus encode dan decode Base32 secara simetris tanpa kehilangan bit", () => {
      const original = Buffer.from("LEDGERLINE-TRUE-COST-2026");
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);
      assert.deepStrictEqual(original, decoded);
    });

    it("Harus menghasilkan token 6 digit deterministik sesuai time step 30 detik", () => {
      const secret = generateTotpSecret(20);
      const t0 = Math.floor(Date.now() / 30000) * 30000;
      const { token: token1, step: step1 } = generateTotpToken(secret, t0);
      const { token: token2, step: step2 } = generateTotpToken(secret, t0 + 5000); // 5s later, same step
      const { token: token3, step: step3 } = generateTotpToken(secret, t0 + 35000); // 35s later, next step

      assert.match(token1, /^\d{6}$/);
      assert.strictEqual(token1, token2);
      assert.strictEqual(step1, step2);
      assert.notStrictEqual(token1, token3);
      assert.strictEqual(step3, step1 + 1);
    });

    it("Harus memverifikasi token dengan toleransi drift ±1 window", () => {
      const secret = generateTotpSecret(20);
      const now = Date.now();
      const { token: currentToken } = generateTotpToken(secret, now);
      const verify = verifyTotpToken(currentToken, secret, { timestampMs: now });
      assert.strictEqual(verify.valid, true);

      // Past window (-30s)
      const { token: pastToken } = generateTotpToken(secret, now - 30000);
      const verifyPast = verifyTotpToken(pastToken, secret, { timestampMs: now });
      assert.strictEqual(verifyPast.valid, true);

      // Out of window (-90s)
      const { token: expiredToken } = generateTotpToken(secret, now - 90000);
      const verifyExpired = verifyTotpToken(expiredToken, secret, { timestampMs: now });
      assert.strictEqual(verifyExpired.valid, false);
    });

    it("Harus mencegah Replay Attack (A14: token tidak bisa dipakai ulang pada step yang sama)", () => {
      const secret = generateTotpSecret(20);
      const now = Date.now();
      const { token, step } = generateTotpToken(secret, now);

      // First verification succeeds
      const first = verifyTotpToken(token, secret, { timestampMs: now, lastUsedStep: -1 });
      assert.strictEqual(first.valid, true);

      // Replay attempt with same token and lastUsedStep recorded
      const replay = verifyTotpToken(token, secret, { timestampMs: now, lastUsedStep: step });
      assert.strictEqual(replay.valid, false);
    });
  });

  describe("2. TOTP Service & Backup Codes (A14)", () => {
    let plainBackupCodes: string[] = [];
    let enrollmentSecret: string;

    it("Harus memulai pendaftaran TOTP dan menghasilkan 8 kode cadangan darurat unik", async () => {
      const enrollment = await TotpService.startEnrollment(ownerUser.userId, tenant.id);
      assert.ok(enrollment.secret);
      assert.ok(enrollment.otpauthUri.startsWith("otpauth://totp/"));
      assert.strictEqual(enrollment.backupCodes.length, 8);

      enrollmentSecret = enrollment.secret;
      plainBackupCodes = enrollment.backupCodes;
    });

    it("Harus mengonfirmasi pendaftaran TOTP dengan token 6 digit pertama yang valid", async () => {
      const { token } = generateTotpToken(enrollmentSecret);
      const result = await TotpService.confirmEnrollment(ownerUser.userId, token);
      assert.strictEqual(result.success, true);
    });

    it("Harus memvalidasi dan mengonsumsi Emergency Backup Code (Single-Use, tidak bisa dipakai 2x)", async () => {
      const firstCode = plainBackupCodes[0];

      // Use backup code once
      const firstUse = await TotpService.verifyCode(ownerUser.userId, firstCode);
      assert.strictEqual(firstUse.valid, true);
      assert.strictEqual(firstUse.usedBackupCode, true);

      // Second attempt with the SAME backup code must fail (already consumed)
      const secondUse = await TotpService.verifyCode(ownerUser.userId, firstCode);
      assert.strictEqual(secondUse.valid, false);
    });
  });

  describe("3. Period Closing Lock Protected by TOTP (§2.2, §18 A14)", () => {
    let testPeriod: any;

    before(async () => {
      testPeriod = await prisma.period.create({
        data: {
          tenantId: tenant.id,
          name: "Periode Oktober 2026",
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-10-31"),
          status: "OPEN",
        },
      });
    });

    it("Harus menolak penutupan buku permanen (closing.lock) jika TOTP code tidak disertakan (AUT-005)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/finance/period-closing",
        cookies: { ll_session: ownerSessionToken },
        payload: {
          periodId: testPeriod.id,
          notes: "Tutup buku akhir bulan",
        },
      });

      assert.strictEqual(res.statusCode, 403);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.error, "AUT-005");
    });

    it("Harus berhasil mengunci periode akuntansi saat TOTP valid diberikan, dan mencatat AuditLog critical", async () => {
      // Fetch user's active secret to generate valid token
      const profile = await prisma.userProfile.findUnique({ where: { userId: ownerUser.userId } });
      const meta = JSON.parse(profile!.metadata);
      const { token } = generateTotpToken(meta.totp.secret, Date.now() + 30000); // 1 step ahead to avoid replay conflict

      const res = await app.inject({
        method: "POST",
        url: "/api/finance/period-closing",
        cookies: { ll_session: ownerSessionToken },
        payload: {
          periodId: testPeriod.id,
          totpCode: token,
          notes: "Tutup buku akhir bulan Oktober",
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.status, "LOCKED");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { tenantId: tenant.id, action: "closing.lock" },
      });
      assert.ok(audit);
      assert.strictEqual(audit.severity, "critical");
    });
  });

  describe("4. Cloud Backup & Automated Disaster Recovery (A15 backup:verify)", () => {
    let backupPackage: any;

    it("Harus membuat paket backup terenkripsi AES-256-GCM dengan SHA-256 checksum", async () => {
      backupPackage = await BackupService.createTenantBackup(tenant.id);
      assert.ok(backupPackage.encryptedData);
      assert.ok(backupPackage.checksum);
      assert.strictEqual(backupPackage.metadata.tenantId, tenant.id);
      assert.ok(backupPackage.metadata.sizeBytes > 0);
    });

    it("Harus memverifikasi integritas snapshot dan memastikan seluruh jurnal Debit == Credit seimbang", () => {
      const report = BackupService.verifyBackup(
        backupPackage.encryptedData,
        backupPackage.checksum,
      );

      assert.strictEqual(report.valid, true);
      assert.strictEqual(report.invariants.allJournalsBalanced, true);
      assert.strictEqual(report.invariants.physicalStockConsistent, true);
    });

    it("Harus menggagalkan verifikasi jika checksum data backup dimanipulasi (Anti-Tampering)", () => {
      assert.throws(() => {
        BackupService.verifyBackup(
          backupPackage.encryptedData,
          "corrupted_checksum_hash_f4k3",
        );
      });
    });
  });

  after(async () => {
    if (app) await app.close();
  });
});
