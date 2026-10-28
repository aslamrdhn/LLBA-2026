process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { prisma } from "../lib/prisma.ts";
import { AuditService } from "../services/audit.service.ts";
import { SessionService } from "../services/session.service.ts";
import { maskCostData } from "../serializers/mask-cost.serializer.ts";
import { guard } from "../shared/middleware/guard.middleware.ts";
import { authRoutes } from "../routes/auth.routes.ts";

describe("Phase 1: Access & Security Tests", () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testOwnerUserId: string;
  let testKasirUserId: string;

  before(async () => {
    // 1. Setup minimal test Fastify instance
    app = Fastify();
    await app.register(fastifyCookie, { secret: "test_cookie_secret_32bytes_long!" });

    // Test route for guard checking
    app.get("/guarded-owner-only", { preHandler: [guard({ roles: ["OWNER"] })] }, async (req) => {
      return { success: true, message: "Welcome Owner", ctx: req.sessionContext };
    });

    app.get("/guarded-any-auth", { preHandler: [guard()] }, async (req) => {
      return { success: true, user: req.sessionContext?.user };
    });

    await app.register(authRoutes, { prefix: "/api/auth" });
    await app.ready();

    // 2. Seed test data in Prisma
    const tenant = await prisma.tenant.create({
      data: {
        name: "Kedai Kopi Uji Fase 1",
        slug: `uji-fase-1-${Date.now()}`,
        status: "active",
        outlets: {
          create: {
            name: "Outlet Pengujian",
          },
        },
      },
      include: { outlets: true },
    });
    testTenantId = tenant.id;
    const testOutletId = tenant.outlets[0].id;

    // Create Owner user
    testOwnerUserId = `owner_test_${Date.now()}`;
    await prisma.userProfile.create({
      data: {
        userId: testOwnerUserId,
        email: `${testOwnerUserId}@ledgerline.test`,
        tenantId: testTenantId,
        role: "OWNER",
        fullName: "Owner Tester",
        status: "active",
        userOutlets: {
          create: {
            outletId: testOutletId,
            tenantId: testTenantId,
            role: "OWNER",
            isDefault: true,
          },
        },
      },
    });

    // Create Kasir user
    testKasirUserId = `kasir_test_${Date.now()}`;
    await prisma.userProfile.create({
      data: {
        userId: testKasirUserId,
        email: `${testKasirUserId}@ledgerline.test`,
        tenantId: testTenantId,
        role: "KASIR",
        fullName: "Kasir Tester",
        status: "active",
        userOutlets: {
          create: {
            outletId: testOutletId,
            tenantId: testTenantId,
            role: "KASIR",
            isDefault: true,
          },
        },
      },
    });
  });

  after(async () => {
    await app.close();
    // Clean up test data
    await prisma.auditLog.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.session.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.userOutlet.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.userProfile.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.outlet.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // Test 1: Zero-Cost Masking Serializer
  // -------------------------------------------------------------
  it("1. Zero-Cost Masking: Kasir tidak menerima data biaya, Owner menerima utuh", () => {
    const rawProduct = {
      id: "prod-1",
      name: "Es Kopi Susu Aren",
      price: 22000,
      costPrice: 8500,
      directHpp: 8000,
      trueHpp: 9500,
      bomCost: 7500,
      margin: 12500,
      ingredients: [
        { name: "Espresso", qty: 30, unitCost: 150 },
        { name: "Susu UHT", qty: 120, unitCost: 20 },
      ],
    };

    // Mask for Kasir
    const maskedForKasir = maskCostData(rawProduct, "KASIR");
    assert.equal(maskedForKasir.name, "Es Kopi Susu Aren");
    assert.equal(maskedForKasir.price, 22000);
    assert.equal("costPrice" in maskedForKasir, false, "costPrice harus dihilangkan untuk kasir");
    assert.equal("directHpp" in maskedForKasir, false, "directHpp harus dihilangkan untuk kasir");
    assert.equal("trueHpp" in maskedForKasir, false, "trueHpp harus dihilangkan untuk kasir");
    assert.equal("bomCost" in maskedForKasir, false, "bomCost harus dihilangkan untuk kasir");
    assert.equal("margin" in maskedForKasir, false, "margin harus dihilangkan untuk kasir");
    assert.equal("unitCost" in maskedForKasir.ingredients[0], false, "unitCost bahan harus dihilangkan untuk kasir");

    // Mask for Owner (must remain completely unmasked)
    const maskedForOwner = maskCostData(rawProduct, "OWNER");
    assert.equal(maskedForOwner.costPrice, 8500);
    assert.equal(maskedForOwner.directHpp, 8000);
    assert.equal(maskedForOwner.trueHpp, 9500);
    assert.equal(maskedForOwner.ingredients[0].unitCost, 150);
  });

  // -------------------------------------------------------------
  // Test 2: Audit Log Hash-Chaining Integrity
  // -------------------------------------------------------------
  it("2. Audit Log: Membangun rantai hash kriptografis prevHash -> hash yang valid", async () => {
    const log1 = await AuditService.recordAuditLog({
      tenantId: testTenantId,
      userId: testOwnerUserId,
      actorRole: "OWNER",
      action: "USER_INVITED",
      resourceType: "user",
    });
    assert.ok(log1);
    assert.equal(log1.prevHash, "GENESIS_LEDGERLINE_CHAIN");
    assert.ok(log1.hash.length === 64, "Hash harus berformat SHA-256 64-karakter hex");

    const log2 = await AuditService.recordAuditLog({
      tenantId: testTenantId,
      userId: testOwnerUserId,
      actorRole: "OWNER",
      action: "PRICE_UPDATED",
      resourceType: "product",
    });
    assert.ok(log2);
    assert.equal(log2.prevHash, log1.hash, "prevHash entri ke-2 harus cocok dengan hash entri ke-1");

    const verification = await AuditService.verifyChainIntegrity(testTenantId);
    assert.equal(verification.isValid, true, "Integritas rantai audit harus valid");
    assert.equal(verification.corruptedLogIds.length, 0);
  });

  // -------------------------------------------------------------
  // Test 3: Session Creation, Validation, and Revocation
  // -------------------------------------------------------------
  it("3. Session Service: Token SHA-256 terverifikasi dan dapat dicabut secara instan", async () => {
    const ownerUser = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: testOwnerUserId },
    });

    const { rawToken, session } = await SessionService.createSession(
      ownerUser.id,
      testTenantId,
      null,
    );
    assert.ok(rawToken);
    assert.ok(session);
    assert.notEqual(rawToken, session.sessionTokenHash, "Token mentah tidak boleh disimpan langsung tanpa hashing");

    // Validate active session
    const validated = await SessionService.validateSession(rawToken);
    assert.ok(validated);
    assert.equal(validated.userProfile.userId, testOwnerUserId);

    // Revoke session
    const revoked = await SessionService.revokeSession(rawToken);
    assert.equal(revoked, true);

    // Validate revoked session should be null
    const validatedAfterRevoke = await SessionService.validateSession(rawToken);
    assert.equal(validatedAfterRevoke, null, "Sesi yang telah dicabut harus bernilai null");
  });

  // -------------------------------------------------------------
  // Test 4: Route Guard Role-Based Enforcement
  // -------------------------------------------------------------
  it("4. Guard RBAC: Menolak akses tanpa token dan menolak Kasir mengakses rute Owner", async () => {
    // 4.1 Unauthenticated request returns 401
    const resNoAuth = await app.inject({
      method: "GET",
      url: "/guarded-any-auth",
    });
    assert.equal(resNoAuth.statusCode, 401);

    // 4.2 Kasir session accessing Owner route returns 403
    const kasirUser = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: testKasirUserId },
    });
    const kasirSession = await SessionService.createSession(
      kasirUser.id,
      testTenantId,
      null,
    );

    const resKasirForbidden = await app.inject({
      method: "GET",
      url: "/guarded-owner-only",
      cookies: {
        ll_session: kasirSession.rawToken,
      },
    });
    assert.equal(resKasirForbidden.statusCode, 403);

    // 4.3 Owner session accessing Owner route returns 200
    const ownerUser = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: testOwnerUserId },
    });
    const ownerSession = await SessionService.createSession(
      ownerUser.id,
      testTenantId,
      null,
    );

    const resOwnerSuccess = await app.inject({
      method: "GET",
      url: "/guarded-owner-only",
      cookies: {
        ll_session: ownerSession.rawToken,
      },
    });
    assert.equal(resOwnerSuccess.statusCode, 200);
    const body = JSON.parse(resOwnerSuccess.body);
    assert.equal(body.success, true);
  });

  // -------------------------------------------------------------
  // Test 5: Full Auth Flow (CSRF, Google Auth, Me, Logout)
  // -------------------------------------------------------------
  it("5. Auth Handshake: CSRF -> Login -> Me -> Logout", async () => {
    // 5.1 CSRF handshake
    const csrfRes = await app.inject({
      method: "GET",
      url: "/api/auth/csrf",
    });
    assert.equal(csrfRes.statusCode, 200);
    const csrfBody = JSON.parse(csrfRes.body);
    assert.ok(csrfBody.csrfToken);

    // 5.2 Google Auth (test mode)
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/google-auth",
      payload: {
        idToken: `test_user_flow_${Date.now()}`,
        action: "login",
      },
    });
    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.body);
    assert.equal(loginBody.success, true);
    assert.ok(loginBody.sessionToken);

    // Extract cookie
    const sessionCookie = loginRes.cookies.find((c) => c.name === "ll_session");
    assert.ok(sessionCookie, "Header Set-Cookie ll_session harus ada");
    assert.equal(sessionCookie.httpOnly, true, "Cookie harus HttpOnly");

    // 5.3 Fetch /api/auth/me using session cookie
    const meRes = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: {
        ll_session: sessionCookie.value,
      },
    });
    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.body);
    assert.equal(meBody.success, true);
    assert.ok(meBody.user);
    assert.equal(meBody.user.role, "OWNER");

    // 5.4 Logout and verify session revocation
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: {
        ll_session: sessionCookie.value,
      },
    });
    assert.equal(logoutRes.statusCode, 200);

    // After logout, accessing /me should fail with 401
    const meAfterLogout = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: {
        ll_session: sessionCookie.value,
      },
    });
    assert.equal(meAfterLogout.statusCode, 401);
  });

  after(async () => {
    if (app) await app.close();
  });
});

