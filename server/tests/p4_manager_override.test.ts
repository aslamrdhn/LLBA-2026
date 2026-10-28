process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { posRoutes } from "../routes/pos.routes.ts";
import { authRoutes } from "../routes/auth.routes.ts";
import { SessionService } from "../services/session.service.ts";
import { OverrideService } from "../services/override.service.ts";

describe("Fase 4: Manager Override PIN & Security Tests (§2.4, §8.14, §8.15)", () => {
  let app: FastifyInstance;
  let tenant: any;
  let cashierProfile: any;
  let managerProfile: any;
  let ownerProfile: any;
  let cashierToken: string;
  let ownerToken: string;

  before(async () => {
    app = Fastify();
    await app.register(fastifyCookie, { secret: "test_cookie_secret_32bytes_long!" });
    await app.register(posRoutes, { prefix: "/api/pos" });
    await app.register(authRoutes, { prefix: "/api/auth" });
    await app.ready();

    // Reset any in-memory rate limits
    OverrideService.resetRateLimit("test-tenant-fase4", "pos-terminal-1");

    // 1. Create Tenant
    tenant = await prisma.tenant.create({
      data: {
        name: "Kedai Kopi Uji Fase 4",
        slug: `fase4-test-${Date.now()}`,
        status: "active",
      },
    });

    const managerPinHash = await bcrypt.hash("8888", 10);
    const cashierPinHash = await bcrypt.hash("123456", 10);

    // 2. Create Cashier Profile
    cashierProfile = await prisma.userProfile.create({
      data: {
        userId: `cashier-f4-${Date.now()}`,
        tenant: { connect: { id: tenant.id } },
        role: "CASHIER",
        fullName: "Budi Kasir",
        pinHash: cashierPinHash,
        status: "active",
      },
    });

    // 3. Create Manager Profile with managerPinHash in metadata
    managerProfile = await prisma.userProfile.create({
      data: {
        userId: `manager-f4-${Date.now()}`,
        tenant: { connect: { id: tenant.id } },
        role: "MANAGER",
        fullName: "Siti Manajer",
        metadata: JSON.stringify({ managerPinHash }),
        status: "active",
      },
    });

    // 4. Create Owner Profile
    ownerProfile = await prisma.userProfile.create({
      data: {
        userId: `owner-f4-${Date.now()}`,
        tenant: { connect: { id: tenant.id } },
        role: "OWNER",
        fullName: "Pak Aslam Owner",
        status: "active",
      },
    });

    // 5. Create active Sessions
    const cashierSession = await SessionService.createSession(
      cashierProfile.id,
      tenant.id,
      null,
      "127.0.0.1",
      "POS Terminal",
    );
    cashierToken = cashierSession.rawToken;

    const ownerSession = await SessionService.createSession(
      ownerProfile.id,
      tenant.id,
      null,
      "127.0.0.1",
      "Owner Laptop",
    );
    ownerToken = ownerSession.rawToken;
  });

  after(async () => {
    await app.close();
    // Teardown
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.session.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userProfile.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  });

  it("1. Valid Manager Override PIN: Sukses otorisasi dan menulis AuditLog", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/pos/manager-override",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `idemp-ovr-1-${Date.now()}`,
        "x-device-id": "pos-terminal-1",
      },
      cookies: {
        ll_session: cashierToken,
      },
      payload: {
        actionType: "DISCOUNT_OVERRIDE",
        entityId: "item-espresso-1",
        reason: "Diskon kemitraan VIP 20%",
        managerPin: "8888",
      },
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.payload);
    assert.equal(json.success, true);
    assert.equal(json.data.authorizedBy, "Siti Manajer");
    assert.ok(json.data.overrideToken);

    // Verify AuditLog written in DB
    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: "MANAGER_OVERRIDE",
        resourceType: "DISCOUNT_OVERRIDE",
      },
    });

    assert.ok(audit);
    assert.equal(audit.actorRole, "MANAGER");
    const meta = JSON.parse(audit.newData || audit.oldData || "{}");
    // metadata is in metadata field or checked
    assert.ok(audit.hash.length === 64); // SHA-256
  });

  it("2. Rejects invalid PIN with AUT_006", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/pos/manager-override",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `idemp-ovr-2-${Date.now()}`,
        "x-device-id": "pos-terminal-1",
      },
      cookies: {
        ll_session: cashierToken,
      },
      payload: {
        actionType: "VOID",
        entityId: "sale-999",
        reason: "Salah pesan",
        managerPin: "9999", // Invalid PIN
      },
    });

    assert.equal(res.statusCode, 403);
    const json = JSON.parse(res.payload);
    assert.equal(json.success, false);
    assert.equal(json.error, "AUT-006");
  });

  it("3. Lockout enforcement: 3 kali salah berturut-turut mengunci perangkat selama 15 menit", async () => {
    try {
      // Attempt 2 and 3 with invalid PIN
      await app.inject({
        method: "POST",
        url: "/api/pos/manager-override",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `idemp-ovr-3a-${Date.now()}`,
          "x-device-id": "pos-terminal-1",
        },
        cookies: { ll_session: cashierToken },
        payload: { actionType: "VOID", entityId: "s1", reason: "test", managerPin: "0000" },
      });

      await app.inject({
        method: "POST",
        url: "/api/pos/manager-override",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `idemp-ovr-3b-${Date.now()}`,
          "x-device-id": "pos-terminal-1",
        },
        cookies: { ll_session: cashierToken },
        payload: { actionType: "VOID", entityId: "s1", reason: "test", managerPin: "0000" },
      });

      // Attempt 4: Device is now locked out
      const lockRes = await app.inject({
        method: "POST",
        url: "/api/pos/manager-override",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `idemp-ovr-3c-${Date.now()}`,
          "x-device-id": "pos-terminal-1",
        },
        cookies: { ll_session: cashierToken },
        payload: { actionType: "VOID", entityId: "s1", reason: "test", managerPin: "0000" },
      });

      assert.equal(lockRes.statusCode, 403);
      const lockJson = JSON.parse(lockRes.payload);
      assert.ok(lockJson.message.includes("terkunci") || lockJson.message.includes("Batas"));
    } finally {
      // Always reset rate limit for subsequent tests
      OverrideService.resetRateLimit(tenant.id, "pos-terminal-1");
    }
  });

  it("4. Rejects non-allowed actionTypes (misal: TRUE_COST_FINALIZE) with AUT_002", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/pos/manager-override",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `idemp-ovr-4-${Date.now()}`,
        "x-device-id": "pos-terminal-1",
      },
      cookies: { ll_session: cashierToken },
      payload: {
        actionType: "TRUE_COST_FINALIZE",
        entityId: "cost-month-1",
        reason: "Bypass cost",
        managerPin: "8888",
      },
    });

    assert.equal(res.statusCode, 403);
    const json = JSON.parse(res.payload);
    assert.equal(json.error, "AUT-002");
  });

  it("5. Mandatory Idempotency-Key header: returns 400 if missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/pos/manager-override",
      headers: {
        "content-type": "application/json",
        // No Idempotency-Key
      },
      cookies: { ll_session: cashierToken },
      payload: {
        actionType: "VOID",
        entityId: "sale-1",
        reason: "Test void",
        managerPin: "8888",
      },
    });

    assert.equal(res.statusCode, 400);
    const json = JSON.parse(res.payload);
    assert.equal(json.error, "VAL_001");
  });

  it("6. §2.4 Rule 8: /api/auth/login/pin menolak role MANAGER/OWNER dari login sesi penuh", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login/pin",
      headers: { "content-type": "application/json" },
      payload: {
        userId: managerProfile.userId,
        pin: "888888",
      },
    });

    assert.equal(res.statusCode, 401);
    const json = JSON.parse(res.payload);
    assert.ok(json.message.includes("tidak diizinkan") || json.message.includes("Google Login"));
  });

  it("7. Owner sets Manager PIN via POST /api/auth/users/:id/set-manager-pin", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/auth/users/${managerProfile.id}/set-manager-pin`,
      headers: { "content-type": "application/json" },
      cookies: { ll_session: ownerToken },
      payload: { pin: "7777" },
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.payload);
    assert.equal(json.success, true);

    // Verify new PIN works
    const testNewPin = await app.inject({
      method: "POST",
      url: "/api/pos/manager-override",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `idemp-ovr-7-${Date.now()}`,
        "x-device-id": "pos-terminal-1",
      },
      cookies: { ll_session: cashierToken },
      payload: {
        actionType: "OPEN_DRAWER",
        entityId: "drawer-1",
        reason: "Pemeriksaan uang kembalian",
        managerPin: "7777",
      },
    });

    assert.equal(testNewPin.statusCode, 200);
  });

  after(async () => {
    if (app) await app.close();
  });
});

