import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.ts";
import { authenticateToken, enforceTenantBoundary } from "../middlewares/auth.ts";

export const subscriptionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Helper: Ensure default plans exist in database
   */
  async function ensureDefaultPlans() {
    const count = await prisma.subscriptionPlan.count();
    if (count > 0) return;

    const defaultPlans = [
      {
        code: "CORE",
        name: "Paket Core POS & True Cost",
        description: "Cocok untuk kedai kopi 1 outlet yang membutuhkan pencatatan kasir offline-first dan penghitungan HPP sejati.",
        priceMonthly: 149000,
        priceYearly: 1490000,
        currency: "IDR",
        entitlements: [
          { featureKey: "MAX_OUTLETS", featureValue: "1" },
          { featureKey: "MAX_USERS", featureValue: "2" },
          { featureKey: "MAX_DEVICES", featureValue: "2" },
          { featureKey: "GOOGLE_SHEETS", featureValue: "false" },
          { featureKey: "MULTI_OUTLET", featureValue: "false" },
          { featureKey: "DECISION_ENGINE", featureValue: "basic" },
        ],
      },
      {
        code: "GROWTH",
        name: "Paket Growth & Multi-Gudang",
        description: "Untuk kedai bertumbuh dengan manajemen resep bertingkat, multi-gudang, dan kalkulasi True Cost otomatis.",
        priceMonthly: 399000,
        priceYearly: 3990000,
        currency: "IDR",
        entitlements: [
          { featureKey: "MAX_OUTLETS", featureValue: "3" },
          { featureKey: "MAX_USERS", featureValue: "5" },
          { featureKey: "MAX_DEVICES", featureValue: "5" },
          { featureKey: "GOOGLE_SHEETS", featureValue: "true" },
          { featureKey: "MULTI_OUTLET", featureValue: "true" },
          { featureKey: "STOCK_TRANSFER", featureValue: "true" },
          { featureKey: "DECISION_ENGINE", featureValue: "advanced" },
        ],
      },
      {
        code: "ENTERPRISE",
        name: "Paket Enterprise All-System",
        description: "Akses lengkap tak terbatas: multi-cabang, digital auditor AI, sinkronisasi Google Drive, dan dukungan prioritas 24/7.",
        priceMonthly: 999000,
        priceYearly: 9990000,
        currency: "IDR",
        entitlements: [
          { featureKey: "MAX_OUTLETS", featureValue: "99" },
          { featureKey: "MAX_USERS", featureValue: "99" },
          { featureKey: "MAX_DEVICES", featureValue: "99" },
          { featureKey: "GOOGLE_SHEETS", featureValue: "true" },
          { featureKey: "GOOGLE_ARCHIVE", featureValue: "true" },
          { featureKey: "MULTI_OUTLET", featureValue: "true" },
          { featureKey: "STOCK_TRANSFER", featureValue: "true" },
          { featureKey: "ADVANCED_APPROVAL", featureValue: "true" },
          { featureKey: "DECISION_ENGINE", featureValue: "advanced" },
          { featureKey: "SUPPLY_ANALYTICS", featureValue: "true" },
          { featureKey: "PRIORITY_SUPPORT", featureValue: "true" },
        ],
      },
    ];

    for (const planData of defaultPlans) {
      const { entitlements, ...planProps } = planData;
      const createdPlan = await prisma.subscriptionPlan.create({
        data: planProps,
      });
      for (const ent of entitlements) {
        await prisma.planEntitlement.create({
          data: {
            planId: createdPlan.id,
            featureKey: ent.featureKey,
            featureValue: ent.featureValue,
          },
        });
      }
    }
  }

  /**
   * GET /api/subscriptions/plans
   * Public/Tenant view of all active subscription plans
   */
  fastify.get("/plans", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await ensureDefaultPlans();
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        include: { entitlements: true },
        orderBy: { priceMonthly: "asc" },
      });

      return reply.code(200).send({
        success: true,
        data: plans,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: "PLANS_FETCH_FAILED",
        message: err.message || "Gagal memuat daftar paket langganan",
      });
    }
  });

  /**
   * Protected endpoints for tenant's active subscription
   */
  fastify.register(async (tenantScope) => {
    tenantScope.addHook("preHandler", authenticateToken);
    tenantScope.addHook("preHandler", enforceTenantBoundary);

    /**
     * GET /api/subscriptions/current
     * Get current authenticated tenant's subscription state
     */
    tenantScope.get("/current", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId!;
        let subscription = await prisma.tenantSubscription.findUnique({
          where: { tenantId },
          include: {
            plan: {
              include: { entitlements: true },
            },
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });

        // If tenant has no explicit subscription record yet, create a default trialing record
        if (!subscription) {
          await ensureDefaultPlans();
          const corePlan = await prisma.subscriptionPlan.findFirst({
            where: { code: "CORE" },
          });

          if (corePlan) {
            subscription = await prisma.tenantSubscription.create({
              data: {
                tenantId,
                planId: corePlan.id,
                status: "TRIALING",
                trialStartsAt: new Date(),
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              },
              include: {
                plan: {
                  include: { entitlements: true },
                },
                invoices: true,
              },
            });
          }
        }

        return reply.code(200).send({
          success: true,
          data: subscription,
        });
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: "SUB_FETCH_FAILED",
          message: err.message || "Gagal memuat status langganan tenant",
        });
      }
    });

    /**
     * POST /api/subscriptions/subscribe
     * Subscribe or upgrade to a chosen plan
     */
    tenantScope.post("/subscribe", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId!;
        const { planCode, billingCycle = "monthly" } = request.body as {
          planCode: string;
          billingCycle?: "monthly" | "yearly";
        };

        const targetPlan = await prisma.subscriptionPlan.findUnique({
          where: { code: planCode },
        });

        if (!targetPlan) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_PLAN",
            message: `Paket '${planCode}' tidak ditemukan.`,
          });
        }

        const durationDays = billingCycle === "yearly" ? 365 : 30;
        const amount = billingCycle === "yearly" ? targetPlan.priceYearly : targetPlan.priceMonthly;
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

        const updatedSubscription = await prisma.tenantSubscription.upsert({
          where: { tenantId },
          create: {
            tenantId,
            planId: targetPlan.id,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          },
          update: {
            planId: targetPlan.id,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          },
          include: {
            plan: {
              include: { entitlements: true },
            },
          },
        });

        // Also record an invoice
        const invoice = await prisma.subscriptionInvoice.create({
          data: {
            subscriptionId: updatedSubscription.id,
            invoiceNumber,
            amount,
            status: "PAID",
            dueAt: new Date(),
            paidAt: new Date(),
            paymentMethod: "QRIS_MANUAL",
          },
        });

        // Record subscription event
        await prisma.subscriptionEvent.create({
          data: {
            subscriptionId: updatedSubscription.id,
            eventType: "UPGRADED",
            toStatus: "ACTIVE",
            actorId: request.user!.userId,
            metadata: JSON.stringify({ planCode, amount, billingCycle, invoiceId: invoice.id }),
          },
        });

        // Sync tenant table plan string
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: planCode.toLowerCase(),
            planExpiresAt: updatedSubscription.currentPeriodEnd,
            lifecycleStatus: "ACTIVE",
          },
        });

        return reply.code(200).send({
          success: true,
          message: `Berhasil mengaktifkan paket ${targetPlan.name}.`,
          data: {
            subscription: updatedSubscription,
            invoice,
          },
        });
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: "SUBSCRIPTION_FAILED",
          message: err.message || "Gagal memproses langganan",
        });
      }
    });
  });
};
