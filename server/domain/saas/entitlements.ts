/**
 * Pure Domain: SaaS Entitlement & Subscription Rules Engine
 * Rule: Zero Fastify or Prisma dependencies for 100% deterministic testability.
 */

export interface EntitlementRuleSet {
  MAX_OUTLETS: number;
  MAX_USERS: number;
  MAX_DEVICES: number;
  GOOGLE_SHEETS: boolean;
  GOOGLE_ARCHIVE: boolean;
  MULTI_OUTLET: boolean;
  STOCK_TRANSFER: boolean;
  ADVANCED_APPROVAL: boolean;
  DECISION_ENGINE: "basic" | "advanced";
  ASSISTED_MIGRATION: boolean;
  SUPPLY_ANALYTICS: boolean;
  PRIORITY_SUPPORT: boolean;
}

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "RESTRICTED"
  | "CANCELED";

export interface TenantSubscriptionState {
  status: SubscriptionStatus;
  planCode: "CORE" | "GROWTH" | "SCALE" | "ENTERPRISE";
  currentPeriodEnd: Date;
  graceEndsAt?: Date | null;
  entitlements: Record<string, string>;
}

export class EntitlementRules {
  /**
   * Parse raw feature value string to boolean or number
   */
  static parseValue(val: string | undefined): boolean | number | string {
    if (val === undefined || val === null) return false;
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
    if (val.toLowerCase() === "unlimited") return Infinity;
    const num = Number(val);
    if (!isNaN(num)) return num;
    return val;
  }

  /**
   * Check if a feature is allowed under current subscription state
   */
  static canAccessFeature(
    state: TenantSubscriptionState,
    featureKey: keyof EntitlementRuleSet,
  ): { allowed: boolean; reason?: string } {
    // Cancellation or Archive mode allows zero new operations
    if (state.status === "CANCELED") {
      return {
        allowed: false,
        reason: "Langganan telah berakhir. Akses dibatasi pada mode arsip (Read-Only).",
      };
    }

    // In RESTRICTED state (D+14), POS selling works but advanced automation is disabled
    if (state.status === "RESTRICTED") {
      const allowedInRestricted = ["MAX_OUTLETS", "MAX_USERS", "MAX_DEVICES"];
      if (!allowedInRestricted.includes(featureKey)) {
        return {
          allowed: false,
          reason: "Akun dalam status RESTRICTED karena pembayaran tertunda. Fitur ini dinonaktifkan sementara.",
        };
      }
    }

    const rawVal = state.entitlements[featureKey];
    const parsed = this.parseValue(rawVal);

    if (typeof parsed === "boolean") {
      return {
        allowed: parsed,
        reason: parsed ? undefined : `Fitur ${featureKey} tidak termasuk dalam paket ${state.planCode}.`,
      };
    }

    if (parsed !== undefined) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Fitur ${featureKey} tidak ditemukan pada konfigurasi paket.`,
    };
  }

  /**
   * Validate capacity limit (e.g. adding a new outlet or user)
   */
  static checkCapacityLimit(
    state: TenantSubscriptionState,
    featureKey: "MAX_OUTLETS" | "MAX_USERS" | "MAX_DEVICES",
    currentCount: number,
  ): { allowed: boolean; max: number; current: number; reason?: string } {
    const rawVal = state.entitlements[featureKey];
    const max = Number(rawVal) || 1;

    if (currentCount >= max) {
      return {
        allowed: false,
        max,
        current: currentCount,
        reason: `Batas kapasitas ${featureKey} untuk paket ${state.planCode} (${max}) telah tercapai. Silakan upgrade paket Anda.`,
      };
    }

    return {
      allowed: true,
      max,
      current: currentCount,
    };
  }

  /**
   * Calculate deterministic health score of a tenant (0 - 100)
   */
  static calculateTenantHealthScore(checks: {
    hasActiveSubscription: boolean;
    reconciliationFailed: boolean;
    hasUnclosedOldShift: boolean;
    hasPendingOfflineTx: boolean;
    hasGoogleSyncError: boolean;
    lastBackupHealthy: boolean;
  }): { score: number; status: "HEALTHY" | "WARNING" | "CRITICAL"; deductions: string[] } {
    let score = 100;
    const deductions: string[] = [];

    if (!checks.hasActiveSubscription) {
      score -= 25;
      deductions.push("Subscription status non-active (-25)");
    }
    if (checks.reconciliationFailed) {
      score -= 35;
      deductions.push("Reconciliation failure detected (-35)");
    }
    if (checks.hasUnclosedOldShift) {
      score -= 15;
      deductions.push("Unclosed past shift found (-15)");
    }
    if (checks.hasPendingOfflineTx) {
      score -= 10;
      deductions.push("Pending offline transactions in queue (-10)");
    }
    if (checks.hasGoogleSyncError) {
      score -= 10;
      deductions.push("Google Sheets mirror error (-10)");
    }
    if (!checks.lastBackupHealthy) {
      score -= 5;
      deductions.push("Backup snapshot unverified (-5)");
    }

    const finalScore = Math.max(0, score);
    let status: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    if (finalScore < 50) {
      status = "CRITICAL";
    } else if (finalScore < 85) {
      status = "WARNING";
    }

    return { score: finalScore, status, deductions };
  }
}
