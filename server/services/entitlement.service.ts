import { prisma } from "../lib/prisma.ts";
import { EntitlementRules, TenantSubscriptionState, EntitlementRuleSet } from "../domain/saas/entitlements.ts";

export class EntitlementService {
  /**
   * Get parsed subscription and entitlements state for a tenant
   */
  static async getTenantSubscriptionState(tenantId: string): Promise<TenantSubscriptionState> {
    const sub = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: {
          include: {
            entitlements: true,
          },
        },
      },
    });

    if (!sub) {
      // Default fallback to 14-day trial Growth if not yet initialized
      const growthPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: "GROWTH" },
        include: { entitlements: true },
      });

      const entitlementsMap: Record<string, string> = {};
      growthPlan?.entitlements.forEach((e) => {
        entitlementsMap[e.featureKey] = e.featureValue;
      });

      return {
        status: "TRIALING",
        planCode: "GROWTH",
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        entitlements: entitlementsMap,
      };
    }

    const entitlementsMap: Record<string, string> = {};
    sub.plan.entitlements.forEach((e) => {
      entitlementsMap[e.featureKey] = e.featureValue;
    });

    return {
      status: sub.status as any,
      planCode: sub.plan.code as any,
      currentPeriodEnd: sub.currentPeriodEnd,
      graceEndsAt: sub.graceEndsAt,
      entitlements: entitlementsMap,
    };
  }

  /**
   * Verify if tenant has entitlement to access a feature
   */
  static async canAccess(tenantId: string, featureKey: keyof EntitlementRuleSet) {
    const state = await this.getTenantSubscriptionState(tenantId);
    return EntitlementRules.canAccessFeature(state, featureKey);
  }

  /**
   * Verify capacity limit (e.g. check current outlets vs MAX_OUTLETS)
   */
  static async checkCapacity(
    tenantId: string,
    featureKey: "MAX_OUTLETS" | "MAX_USERS" | "MAX_DEVICES",
  ) {
    const state = await this.getTenantSubscriptionState(tenantId);

    let currentCount = 0;
    if (featureKey === "MAX_OUTLETS") {
      currentCount = await prisma.outlet.count({ where: { tenantId } });
    } else if (featureKey === "MAX_USERS") {
      currentCount = await prisma.userProfile.count({ where: { tenantId } });
    } else if (featureKey === "MAX_DEVICES") {
      currentCount = await prisma.device.count({ where: { tenantId } });
    }

    return EntitlementRules.checkCapacityLimit(state, featureKey, currentCount);
  }
}
