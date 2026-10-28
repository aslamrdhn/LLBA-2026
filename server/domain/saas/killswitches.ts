/**
 * Pure Domain System Kill Switch Evaluator
 * Allows granular shutdown of specific integrations or features during incidents
 */

export const SYSTEM_SERVICES = [
  "GOOGLE_SYNC",
  "POS_OFFLINE_SYNC",
  "SUPPLY_ORDER",
  "MIGRATION_COMMIT",
  "EXPORT",
] as const;

export type SystemServiceKey = (typeof SYSTEM_SERVICES)[number];

export interface ActiveKillSwitch {
  serviceKey: string;
  isKilled: boolean;
  reason?: string | null;
}

export class KillSwitchRules {
  /**
   * Deterministically checks if a service is allowed to execute
   */
  static isServiceAllowed(
    serviceKey: SystemServiceKey,
    activeSwitches: ActiveKillSwitch[]
  ): { allowed: boolean; reason?: string } {
    const sw = activeSwitches.find((s) => s.serviceKey === serviceKey);
    if (sw && sw.isKilled) {
      return {
        allowed: false,
        reason: sw.reason || `Layanan ${serviceKey} dinonaktifkan sementara oleh Super Admin.`,
      };
    }
    return { allowed: true };
  }
}
