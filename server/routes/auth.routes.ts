import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import { AuthService } from "../services/auth.service.ts";
import { SessionService } from "../services/session.service.ts";
import { guard, extractSessionToken } from "../shared/middleware/guard.middleware.ts";
import { maskCostData } from "../serializers/mask-cost.serializer.ts";
import { OverrideService } from "../services/override.service.ts";
import { TotpService } from "../services/totp.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { prisma } from "../lib/prisma.ts";

const PinLoginSchema = z.object({
  userId: z.string(),
  pin: z.string().length(6, "PIN harus 6 digit"),
  deviceId: z.string().optional(),
});

const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token diperlukan"),
  action: z.enum(["login", "register"]).default("login"),
  storeName: z.string().optional(),
  storePhone: z.string().optional(),
  storeAddress: z.string().optional(),
  outletId: z.string().optional(),
});

const SelfServiceOnboardSchema = z.object({
  businessName: z.string().min(2, "Nama usaha minimal 2 karakter"),
  businessType: z.string().default("COFFEE_SHOP"),
  ownerName: z.string().min(2, "Nama pemilik minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(8, "Nomor telepon minimal 8 digit"),
  city: z.string().default("Jakarta"),
  firstOutletName: z.string().default("Outlet Utama"),
  idToken: z.string().optional(),
  pin: z.string().optional(),
});

const SwitchOutletSchema = z.object({
  outletId: z.string().uuid("ID outlet tidak valid"),
});

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/auth/csrf
   * CSRF protection token handshake
   */
  fastify.get("/csrf", async (_request: FastifyRequest, reply: FastifyReply) => {
    const csrfToken = crypto.randomBytes(24).toString("hex");
    return reply.send({
      success: true,
      csrfToken,
    });
  });

  /**
   * POST /api/auth/login/pin
   * POS Cashier / Kitchen PIN Login
   */
  fastify.post(
    "/login/pin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsedBody = PinLoginSchema.parse(request.body);
        const result = await AuthService.loginWithPin(
          parsedBody.userId,
          parsedBody.pin,
          parsedBody.deviceId,
        );

        // Create server-side session
        const { rawToken, session } = await SessionService.createSession(
          result.user.id,
          result.user.tenantId,
          result.user.userOutlets?.[0]?.outletId || null,
          request.ip,
          request.headers["user-agent"],
        );

        // Set HttpOnly cookie
        reply.setCookie("ll_session", rawToken, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        return reply.send({
          success: true,
          sessionToken: rawToken,
          role: result.user.role,
          user: maskCostData(result.user, result.user.role),
          activeOutletId: session.outletId,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Input tidak valid",
          });
        }
        return reply.code(401).send({
          success: false,
          error: "AUTH_FAILED",
          message: error.message || "Gagal masuk dengan PIN",
        });
      }
    },
  );

  /**
   * POST /api/auth/google-auth (and POST /api/auth/google)
   * Google OAuth / Firebase ID Token Login
   */
  const handleGoogleAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsedBody = GoogleAuthSchema.parse(request.body);
      const result = await AuthService.googleAuth(parsedBody);

      // Create server-side session
      const targetOutletId =
        parsedBody.outletId ||
        result.user.userOutlets?.[0]?.outletId ||
        (result.tenant as any)?.outlets?.[0]?.id ||
        null;

      const { rawToken, session } = await SessionService.createSession(
        result.user.id,
        result.tenant?.id || result.user.tenantId,
        targetOutletId,
        request.ip,
        request.headers["user-agent"],
      );

      // Set HttpOnly cookie
      reply.setCookie("ll_session", rawToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        success: true,
        sessionToken: rawToken,
        token: result.token,
        tenant: result.tenant,
        user: maskCostData(result.user, result.user.role),
        activeOutletId: session.outletId,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "VALIDATION_ERROR",
          message: error.issues[0]?.message || "Data autentikasi tidak valid",
        });
      }
      return reply.code(401).send({
        success: false,
        error: "AUTH_FAILED",
        message: error.message || "Autentikasi Google gagal",
      });
    }
  };

  fastify.post("/google-auth", handleGoogleAuth);
  fastify.post("/google", handleGoogleAuth);


  /**
   * GET /api/auth/me
   * Return authenticated session profile with role and outlet details
   */
  fastify.get(
    "/me",
    { preHandler: [guard()] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.sessionContext!;
      const user = ctx.user;

      return reply.send({
        success: true,
        user: maskCostData(
          {
            id: user.id,
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
            role: ctx.role,
            status: user.status,
            phone: user.phone,
            assignedOutlets: user.userOutlets || [],
          },
          ctx.role,
        ),
        tenant: ctx.session.tenant || null,
        activeOutlet: ctx.session.outlet || null,
      });
    },
  );

  /**
   * POST /api/auth/switch-outlet
   * Switch the active outlet in current server session
   */
  fastify.post(
    "/switch-outlet",
    { preHandler: [guard()] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = SwitchOutletSchema.parse(request.body);
        const token = extractSessionToken(request)!;

        const updated = await SessionService.switchOutlet(token, parsed.outletId);

        return reply.send({
          success: true,
          message: "Outlet berhasil diganti",
          activeOutlet: updated.outlet,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: "VALIDATION_ERROR",
            message: error.issues[0]?.message,
          });
        }
        return reply.code(400).send({
          success: false,
          error: "SWITCH_FAILED",
          message: error.message,
        });
      }
    },
  );

  /**
   * POST /api/auth/logout
   * Revoke session and clear HttpOnly cookie
   */
  fastify.post("/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractSessionToken(request);
    if (token) {
      await SessionService.revokeSession(token);
    }

    reply.clearCookie("ll_session", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return reply.send({
      success: true,
      message: "Berhasil keluar dari sesi",
    });
  });

  /**
   * POST /api/auth/refresh-token & POST /api/auth/refresh
   * Transparent session refresh
   */
  const handleRefreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractSessionToken(request);
    if (!token) {
      return reply.code(401).send({
        success: false,
        error: "AUTH_REQUIRED",
        message: "Token sesi tidak ditemukan",
      });
    }
    const session = await SessionService.validateSession(token);
    if (!session) {
      return reply.code(401).send({
        success: false,
        error: "AUTH_EXPIRED",
        message: "Sesi telah berakhir atau tidak valid",
      });
    }
    return reply.send({
      success: true,
      sessionToken: token,
      role: session.userProfile.role,
      user: maskCostData(session.userProfile, session.userProfile.role),
      activeOutletId: session.outletId,
    });
  };

  fastify.post("/refresh-token", handleRefreshToken);
  fastify.post("/refresh", handleRefreshToken);

  /**
   * POST /api/auth/users/:id/set-manager-pin (§2.4 rule 2)
   * Only OWNER can set Manager Override PIN
   */
  fastify.post(
    "/users/:id/set-manager-pin",
    { preHandler: [guard({ roles: ["OWNER"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { pin } = request.body as { pin: string };
        const tenantId = request.sessionContext?.tenantId;

        if (!tenantId) {
          return reply.code(401).send({
            success: false,
            error: "UNAUTHORIZED",
            message: "Tenant tidak ditemukan dalam sesi",
          });
        }

        await OverrideService.setManagerPin(id, tenantId, pin);

        return reply.send({
          success: true,
          message: "Manager Override PIN berhasil diperbarui",
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
          error: "SYS_001",
          message: error.message || "Gagal mengatur PIN Manager",
        });
      }
    },
  );

  /**
   * POST /api/auth/totp/enroll (§2.2, §18 A14)
   * Start 2FA enrollment for Owner / Manager
   */
  fastify.post(
    "/totp/enroll",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER", "SUPER_ADMIN"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.sessionContext!.user.id;
        const tenantId = request.sessionContext!.tenantId!;
        const result = await TotpService.startEnrollment(userId, tenantId);

        return reply.code(200).send({
          success: true,
          data: result,
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
          error: "SYS_001",
          message: error.message || "Gagal memulai enrollment TOTP",
        });
      }
    },
  );

  /**
   * POST /api/auth/totp/confirm (§2.2, §18 A14)
   * Confirm 2FA enrollment with initial token
   */
  fastify.post(
    "/totp/confirm",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER", "SUPER_ADMIN"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.sessionContext!.user.id;
        const { token } = request.body as { token: string };

        if (!token) {
          throw new LedgerError("VAL-001", "Token TOTP 6 digit diperlukan.");
        }

        await TotpService.confirmEnrollment(userId, token);

        return reply.code(200).send({
          success: true,
          message: "Autentikasi 2 Faktor (TOTP) berhasil diaktifkan.",
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
          error: "SYS_001",
          message: error.message || "Gagal mengonfirmasi TOTP",
        });
      }
    },
  );

  /**
   * POST /api/auth/totp/verify (§2.2, §18 A14)
   * Verify TOTP code or backup code for critical enterprise operations
   */
  fastify.post(
    "/totp/verify",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER", "SUPER_ADMIN"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.sessionContext!.user.id;
        const { code } = request.body as { code: string };

        if (!code) {
          throw new LedgerError("VAL-001", "Kode TOTP atau kode cadangan diperlukan.");
        }

        const verification = await TotpService.verifyCode(userId, code);
        if (!verification.valid) {
          throw new LedgerError("AUT-005", "Kode TOTP atau kode cadangan tidak valid.");
        }

        return reply.code(200).send({
          success: true,
          data: {
            verified: true,
            usedBackupCode: verification.usedBackupCode || false,
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
          error: "SYS_001",
          message: error.message || "Verifikasi TOTP gagal",
        });
      }
    },
  );

  /**
   * POST /api/auth/self-service-onboard
   * Self-Service Onboarding for Business Owners (Instant Trial Provisioning)
   */
  fastify.post(
    "/self-service-onboard",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = SelfServiceOnboardSchema.parse(request.body);
        const result = await AuthService.selfServiceOnboard(parsed);

        // Create server-side session
        const primaryOutlet = (result.tenant as any)?.outlets?.[0] || result.user.userOutlets?.[0]?.outlet;
        const { rawToken, session } = await SessionService.createSession(
          result.user.id,
          result.tenant.id,
          primaryOutlet?.id || null,
          request.ip,
          request.headers["user-agent"],
        );

        // Set HttpOnly cookie
        reply.setCookie("ll_session", rawToken, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60,
        });

        return reply.code(201).send({
          success: true,
          message: "Pendaftaran mandiri berhasil! Masa percobaan 14 hari telah aktif.",
          sessionToken: rawToken,
          token: result.token,
          tenant: result.tenant,
          user: maskCostData(result.user, result.user.role),
          activeOutletId: session.outletId,
          subscription: result.subscription,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Data pendaftaran tidak valid",
          });
        }
        return reply.code(400).send({
          success: false,
          error: "ONBOARDING_FAILED",
          message: error.message || "Gagal melakukan pendaftaran mandiri",
        });
      }
    },
  );

  /**
   * GET /api/tenant/onboarding-status
   * Get Current Tenant Onboarding Progress
   */
  fastify.get(
    "/tenant/onboarding-status",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER", "SUPER_ADMIN"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.sessionContext!.tenantId!;
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            lifecycleStatus: true,
            onboardingStep: true,
            onboardingCompleted: true,
          },
        });

        if (!tenant) {
          return reply.code(404).send({
            success: false,
            error: "NOT_FOUND",
            message: "Tenant tidak ditemukan",
          });
        }

        return reply.send({
          success: true,
          data: tenant,
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal membaca status onboarding",
        });
      }
    },
  );

  /**
   * PATCH /api/tenant/onboarding-step
   * Advance or Complete Setup Wizard Step
   */
  fastify.patch(
    "/tenant/onboarding-step",
    { preHandler: [guard({ roles: ["OWNER", "SUPER_ADMIN"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const StepSchema = z.object({
          step: z.number().int().min(1).max(7),
          completed: z.boolean().optional(),
        });
        const parsed = StepSchema.parse(request.body);
        const tenantId = request.sessionContext!.tenantId!;

        const updated = await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            onboardingStep: parsed.step,
            ...(parsed.completed !== undefined ? { onboardingCompleted: parsed.completed } : {}),
          },
          select: {
            id: true,
            name: true,
            onboardingStep: true,
            onboardingCompleted: true,
            lifecycleStatus: true,
          },
        });

        return reply.send({
          success: true,
          message: `Langkah onboarding diperbarui ke tahap ${parsed.step}`,
          data: updated,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Input langkah tidak valid",
          });
        }
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal memperbarui langkah onboarding",
        });
      }
    },
  );

  /**
   * GET /api/tenant/support-access-logs (§15 Customer-Visible Admin Access Log)
   * Transparency view: Store owner inspects all Super Admin support sessions
   */
  fastify.get(
    "/tenant/support-access-logs",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER", "SUPER_ADMIN"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.sessionContext!.tenantId!;
        const sessions = await prisma.supportSession.findMany({
          where: { tenantId },
          orderBy: { startedAt: "desc" },
          take: 50,
        });

        return reply.send({
          success: true,
          data: sessions.map((s) => ({
            id: s.id,
            adminId: s.adminId,
            ticketNumber: s.ticketNumber,
            reason: s.reason,
            mode: s.mode,
            startedAt: s.startedAt,
            expiresAt: s.expiresAt,
            endedAt: s.endedAt,
            durationMinutes: s.endedAt
              ? Math.max(1, Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000))
              : Math.max(1, Math.round((Date.now() - s.startedAt.getTime()) / 60000)),
          })),
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal memuat log akses support",
        });
      }
    },
  );
}

