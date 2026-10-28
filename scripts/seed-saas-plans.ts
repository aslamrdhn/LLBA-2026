import { prisma } from "../server/lib/prisma.ts";

export async function seedSaasPlans() {
  console.log("🌱 Seeding SaaS Subscription Plans & Entitlements...");

  const plans = [
    {
      code: "CORE",
      name: "LedgerLine Core",
      description: "Untuk kedai kopi / resto independen 1 outlet.",
      priceMonthly: 99000,
      priceYearly: 990000,
      entitlements: {
        MAX_OUTLETS: "1",
        MAX_USERS: "5",
        MAX_DEVICES: "2",
        GOOGLE_SHEETS: "false",
        GOOGLE_ARCHIVE: "false",
        MULTI_OUTLET: "false",
        STOCK_TRANSFER: "false",
        ADVANCED_APPROVAL: "false",
        DECISION_ENGINE: "basic",
        ASSISTED_MIGRATION: "false",
        SUPPLY_ANALYTICS: "false",
        PRIORITY_SUPPORT: "false",
      },
    },
    {
      code: "GROWTH",
      name: "LedgerLine Growth",
      description: "Paket paling populer untuk kedai yang berkembang dan Owner mengontrol dari jauh.",
      priceMonthly: 249000,
      priceYearly: 2490000,
      entitlements: {
        MAX_OUTLETS: "3",
        MAX_USERS: "20",
        MAX_DEVICES: "10",
        GOOGLE_SHEETS: "true",
        GOOGLE_ARCHIVE: "true",
        MULTI_OUTLET: "true",
        STOCK_TRANSFER: "true",
        ADVANCED_APPROVAL: "true",
        DECISION_ENGINE: "advanced",
        ASSISTED_MIGRATION: "false",
        SUPPLY_ANALYTICS: "false",
        PRIORITY_SUPPORT: "false",
      },
    },
    {
      code: "SCALE",
      name: "LedgerLine Scale",
      description: "Untuk coffee chain multi-cabang dengan kendali operasional terpusat.",
      priceMonthly: 499000,
      priceYearly: 4990000,
      entitlements: {
        MAX_OUTLETS: "10",
        MAX_USERS: "unlimited",
        MAX_DEVICES: "30",
        GOOGLE_SHEETS: "true",
        GOOGLE_ARCHIVE: "true",
        MULTI_OUTLET: "true",
        STOCK_TRANSFER: "true",
        ADVANCED_APPROVAL: "true",
        DECISION_ENGINE: "advanced",
        ASSISTED_MIGRATION: "true",
        SUPPLY_ANALYTICS: "true",
        PRIORITY_SUPPORT: "true",
      },
    },
  ];

  for (const p of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: p.code },
    });

    let planId = existing?.id;

    if (!existing) {
      const created = await prisma.subscriptionPlan.create({
        data: {
          code: p.code,
          name: p.name,
          description: p.description,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
          version: 1,
          isActive: true,
        },
      });
      planId = created.id;
      console.log(`✅ Paket '${p.name}' berhasil dibuat.`);
    } else {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          description: p.description,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
        },
      });
      console.log(`🔄 Paket '${p.name}' diperbarui.`);
    }

    // Upsert entitlements
    for (const [key, val] of Object.entries(p.entitlements)) {
      const existingEnt = await prisma.planEntitlement.findUnique({
        where: {
          planId_featureKey: {
            planId: planId!,
            featureKey: key,
          },
        },
      });

      if (existingEnt) {
        await prisma.planEntitlement.update({
          where: { id: existingEnt.id },
          data: { featureValue: val },
        });
      } else {
        await prisma.planEntitlement.create({
          data: {
            planId: planId!,
            featureKey: key,
            featureValue: val,
          },
        });
      }
    }
  }

  // Ensure active tenants have a subscription attached
  const growthPlan = await prisma.subscriptionPlan.findUnique({ where: { code: "GROWTH" } });
  if (growthPlan) {
    const tenants = await prisma.tenant.findMany({
      include: { subscription: true },
    });

    for (const t of tenants) {
      if (!t.subscription) {
        const now = new Date();
        const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day trial
        await prisma.tenantSubscription.create({
          data: {
            tenantId: t.id,
            planId: growthPlan.id,
            status: "TRIALING",
            trialStartsAt: now,
            trialEndsAt: end,
            currentPeriodStart: now,
            currentPeriodEnd: end,
          },
        });
        console.log(`🎁 Tenant '${t.name}' diberikan 14-Day Growth Trial otomatis.`);
      }
    }
  }

  console.log("🏁 Seeding SaaS selesai dengan sukses.");
}

if (process.argv[1]?.endsWith("seed-saas-plans.ts")) {
  seedSaasPlans()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error("❌ Error seeding SaaS plans:", err);
      prisma.$disconnect();
      process.exit(1);
    });
}
