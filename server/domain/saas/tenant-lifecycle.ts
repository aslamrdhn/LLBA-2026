/**
 * Pure Domain SaaS Tenant Lifecycle State Machine
 * Deterministic transition rules for LedgerLine B2B SaaS platform
 */

export type TenantLifecycleStatus =
  | "PROVISIONING"
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "ARCHIVED"
  | "CANCELING"
  | "CANCELED";

const VALID_TRANSITIONS: Record<TenantLifecycleStatus, TenantLifecycleStatus[]> = {
  PROVISIONING: ["TRIAL", "ACTIVE", "SUSPENDED"],
  TRIAL: ["ACTIVE", "PAST_DUE", "RESTRICTED", "SUSPENDED", "CANCELING", "CANCELED"],
  ACTIVE: ["PAST_DUE", "RESTRICTED", "SUSPENDED", "CANCELING", "CANCELED"],
  PAST_DUE: ["ACTIVE", "RESTRICTED", "SUSPENDED", "CANCELED"],
  RESTRICTED: ["ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"],
  SUSPENDED: ["ACTIVE", "RESTRICTED", "ARCHIVED"],
  CANCELING: ["CANCELED", "ACTIVE"],
  CANCELED: ["ARCHIVED", "ACTIVE"], // Re-activation allowed with new subscription
  ARCHIVED: [], // Terminal read-only state (cold retention)
};

export class TenantLifecycleRules {
  /**
   * Validates if a lifecycle transition is allowed
   */
  static canTransition(from: TenantLifecycleStatus, to: TenantLifecycleStatus): boolean {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Deterministically calculates tenant lifecycle based on subscription & dunning conditions
   */
  static evaluateLifecycle({
    currentStatus,
    subscriptionStatus,
    daysPastDue = 0,
    isManualSuspended = false,
  }: {
    currentStatus: TenantLifecycleStatus;
    subscriptionStatus: string;
    daysPastDue?: number;
    isManualSuspended?: boolean;
  }): { targetStatus: TenantLifecycleStatus; reason: string } {
    if (isManualSuspended) {
      return { targetStatus: "SUSPENDED", reason: "Penangguhan manual oleh Super Admin" };
    }

    if (currentStatus === "ARCHIVED") {
      return { targetStatus: "ARCHIVED", reason: "Data dalam masa retensi arsip" };
    }

    if (subscriptionStatus === "ACTIVE") {
      return { targetStatus: "ACTIVE", reason: "Langganan aktif dan terbayar" };
    }

    if (subscriptionStatus === "TRIALING") {
      return { targetStatus: "TRIAL", reason: "Dalam masa percobaan 14 hari" };
    }

    if (subscriptionStatus === "PAST_DUE" || subscriptionStatus === "GRACE_PERIOD") {
      if (daysPastDue > 14) {
        return { targetStatus: "SUSPENDED", reason: "Jatuh tempo pembayaran > 14 hari" };
      }
      if (daysPastDue > 7) {
        return { targetStatus: "RESTRICTED", reason: "Melewati grace period 7 hari (akses terbatas)" };
      }
      return { targetStatus: "PAST_DUE", reason: "Invoice langganan belum terbayar" };
    }

    if (subscriptionStatus === "RESTRICTED") {
      return { targetStatus: "RESTRICTED", reason: "Batas fitur diberlakukan" };
    }

    if (subscriptionStatus === "CANCELED") {
      return { targetStatus: "CANCELED", reason: "Langganan dihentikan (Read-Only Archive Mode)" };
    }

    return { targetStatus: currentStatus, reason: "Status tidak berubah" };
  }

  /**
   * Determines if operational actions (creating sales, stock movements) are allowed
   */
  static isOperationalAllowed(status: TenantLifecycleStatus): boolean {
    // POS transactions are permitted during TRIAL, ACTIVE, and PAST_DUE (to protect store cashier flow)
    return status === "TRIAL" || status === "ACTIVE" || status === "PAST_DUE";
  }

  /**
   * Determines if reading historical data (auditing, reports, tax export) is allowed
   * Historical books and audit logs are NEVER deleted or revoked on subscription lapse
   * for tax and audit compliance across all lifecycle states.
   */
  static isHistoricalReadAllowed(_status: TenantLifecycleStatus): boolean {
    return true;
  }
}
