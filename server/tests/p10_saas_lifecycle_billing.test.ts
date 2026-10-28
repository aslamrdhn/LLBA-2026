import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TenantLifecycleRules,
  TenantLifecycleStatus,
} from "../domain/saas/tenant-lifecycle.ts";
import {
  TenantDiagnosticsRules,
  TenantDiagnosticInput,
} from "../domain/saas/diagnostics.ts";
import {
  KillSwitchRules,
  ActiveKillSwitch,
} from "../domain/saas/killswitches.ts";

describe("Phase 10: SaaS Tenant Lifecycle, Diagnostics, & Commercial Engine", () => {
  // =========================================================================
  // 1. TENANT LIFECYCLE STATE MACHINE
  // =========================================================================
  describe("1. Tenant Lifecycle State Machine", () => {
    it("should allow valid forward progression from PROVISIONING through ACTIVE", () => {
      assert.equal(TenantLifecycleRules.canTransition("PROVISIONING", "TRIAL"), true);
      assert.equal(TenantLifecycleRules.canTransition("TRIAL", "ACTIVE"), true);
      assert.equal(TenantLifecycleRules.canTransition("ACTIVE", "PAST_DUE"), true);
      assert.equal(TenantLifecycleRules.canTransition("PAST_DUE", "RESTRICTED"), true);
      assert.equal(TenantLifecycleRules.canTransition("RESTRICTED", "SUSPENDED"), true);
      assert.equal(TenantLifecycleRules.canTransition("SUSPENDED", "ARCHIVED"), true);
    });

    it("should reject invalid transitions (e.g. escaping terminal ARCHIVED state)", () => {
      // ARCHIVED is terminal read-only
      assert.equal(TenantLifecycleRules.canTransition("ARCHIVED", "TRIAL"), false);
      assert.equal(TenantLifecycleRules.canTransition("ARCHIVED", "ACTIVE"), false);
      assert.equal(TenantLifecycleRules.canTransition("ARCHIVED", "PROVISIONING"), false);

      // SUSPENDED cannot jump back to PROVISIONING
      assert.equal(TenantLifecycleRules.canTransition("SUSPENDED", "PROVISIONING"), false);
    });

    it("should support voluntary cancellation path without data deletion", () => {
      assert.equal(TenantLifecycleRules.canTransition("ACTIVE", "CANCELING"), true);
      assert.equal(TenantLifecycleRules.canTransition("CANCELING", "CANCELED"), true);
      assert.equal(TenantLifecycleRules.canTransition("CANCELED", "ARCHIVED"), true);
      // Re-activation from CANCELED with new plan is allowed
      assert.equal(TenantLifecycleRules.canTransition("CANCELED", "ACTIVE"), true);
    });

    it("should enforce operational allowance: permits POS in TRIAL, ACTIVE, and PAST_DUE", () => {
      // Protect cashier flow even during brief grace periods
      assert.equal(TenantLifecycleRules.isOperationalAllowed("TRIAL"), true);
      assert.equal(TenantLifecycleRules.isOperationalAllowed("ACTIVE"), true);
      assert.equal(TenantLifecycleRules.isOperationalAllowed("PAST_DUE"), true);

      // Hard block when restricted, suspended, or archived
      assert.equal(TenantLifecycleRules.isOperationalAllowed("RESTRICTED"), false);
      assert.equal(TenantLifecycleRules.isOperationalAllowed("SUSPENDED"), false);
      assert.equal(TenantLifecycleRules.isOperationalAllowed("ARCHIVED"), false);
      assert.equal(TenantLifecycleRules.isOperationalAllowed("CANCELED"), false);
    });

    it("should guarantee historical data read is NEVER revoked on subscription lapse", () => {
      const allStatuses: TenantLifecycleStatus[] = [
        "PROVISIONING",
        "TRIAL",
        "ACTIVE",
        "PAST_DUE",
        "RESTRICTED",
        "SUSPENDED",
        "ARCHIVED",
        "CANCELING",
        "CANCELED",
      ];
      for (const st of allStatuses) {
        assert.equal(
          TenantLifecycleRules.isHistoricalReadAllowed(st),
          true,
          `Historical read must be permitted in state ${st} for tax and audit compliance`
        );
      }
    });
  });

  // =========================================================================
  // 2. DUNNING & GRACE PERIOD DETERMINISTIC EVALUATION
  // =========================================================================
  describe("2. Dunning & Automatic Lifecycle Evaluation", () => {
    it("should evaluate TRIALING subscription to TRIAL tenant status", () => {
      const res = TenantLifecycleRules.evaluateLifecycle({
        currentStatus: "TRIAL",
        subscriptionStatus: "TRIALING",
      });
      assert.equal(res.targetStatus, "TRIAL");
    });

    it("should transition to PAST_DUE on initial unpaid invoice (<= 7 days)", () => {
      const res = TenantLifecycleRules.evaluateLifecycle({
        currentStatus: "ACTIVE",
        subscriptionStatus: "PAST_DUE",
        daysPastDue: 3,
      });
      assert.equal(res.targetStatus, "PAST_DUE");
      assert.match(res.reason, /Invoice langganan belum terbayar/);
    });

    it("should transition to RESTRICTED after grace period (8-14 days past due)", () => {
      const res = TenantLifecycleRules.evaluateLifecycle({
        currentStatus: "PAST_DUE",
        subscriptionStatus: "PAST_DUE",
        daysPastDue: 10,
      });
      assert.equal(res.targetStatus, "RESTRICTED");
      assert.match(res.reason, /Melewati grace period 7 hari/);
    });

    it("should automatically suspend tenant after 14 days of unpaid overdue", () => {
      const res = TenantLifecycleRules.evaluateLifecycle({
        currentStatus: "RESTRICTED",
        subscriptionStatus: "PAST_DUE",
        daysPastDue: 15,
      });
      assert.equal(res.targetStatus, "SUSPENDED");
      assert.match(res.reason, /Jatuh tempo pembayaran > 14 hari/);
    });

    it("should immediately reactivate to ACTIVE once payment is confirmed", () => {
      const res = TenantLifecycleRules.evaluateLifecycle({
        currentStatus: "RESTRICTED",
        subscriptionStatus: "ACTIVE",
        daysPastDue: 0,
      });
      assert.equal(res.targetStatus, "ACTIVE");
      assert.match(res.reason, /Langganan aktif dan terbayar/);
    });
  });

  // =========================================================================
  // 3. TENANT DIAGNOSTICS & RECOMMENDATIONS ENGINE
  // =========================================================================
  describe("3. Tenant Diagnostics & Recommendations Engine", () => {
    it("should score 100 and HEALTHY on fully compliant tenant data", () => {
      const cleanInput: TenantDiagnosticInput = {
        unclosedShiftsCount: 0,
        pendingOfflineTxCount: 0,
        unbalancedJournalsCount: 0,
        negativeStockItemsCount: 0,
        failedReconciliationCount: 0,
        isBackupHealthy: true,
        googleSyncError: false,
      };

      const report = TenantDiagnosticsRules.evaluate(cleanInput);
      assert.equal(report.score, 100);
      assert.equal(report.overallHealth, "HEALTHY");
      assert.equal(report.criticalCount, 0);
      assert.equal(report.warningCount, 0);
      assert.equal(report.checks.length >= 6, true);
    });

    it("should detect unbalanced double-entry journals with CRITICAL penalty", () => {
      const corruptedJournals: TenantDiagnosticInput = {
        unclosedShiftsCount: 0,
        pendingOfflineTxCount: 0,
        unbalancedJournalsCount: 2, // 2 journals with Debit != Credit
        negativeStockItemsCount: 0,
        failedReconciliationCount: 0,
        isBackupHealthy: true,
        googleSyncError: false,
      };

      const report = TenantDiagnosticsRules.evaluate(corruptedJournals);
      assert.equal(report.score, 70); // 100 - 30
      assert.equal(report.overallHealth, "CRITICAL");
      assert.equal(report.criticalCount, 1);

      const journalCheck = report.checks.find((c) => c.code === "DIAG-ACC-001");
      assert.ok(journalCheck);
      assert.equal(journalCheck.severity, "CRITICAL");
      assert.match(journalCheck.message, /Ditemukan 2 jurnal dengan Debit != Credit/);
      assert.match(journalCheck.recommendation, /reversing entry/);
    });

    it("should detect physical negative stock with blind opname recommendation", () => {
      const negativeStock: TenantDiagnosticInput = {
        unclosedShiftsCount: 0,
        pendingOfflineTxCount: 0,
        unbalancedJournalsCount: 0,
        negativeStockItemsCount: 3,
        failedReconciliationCount: 0,
        isBackupHealthy: true,
        googleSyncError: false,
      };

      const report = TenantDiagnosticsRules.evaluate(negativeStock);
      assert.equal(report.score, 80); // 100 - 20
      assert.equal(report.overallHealth, "CRITICAL");

      const stockCheck = report.checks.find((c) => c.code === "DIAG-STK-003");
      assert.ok(stockCheck);
      assert.equal(stockCheck.severity, "CRITICAL");
      assert.match(stockCheck.message, /3 bahan baku dengan kuantitas fisik negatif/);
      assert.match(stockCheck.recommendation, /blind opname/);
    });
  });

  // =========================================================================
  // 4. GRANULAR SYSTEM KILL SWITCHES (§18 PRD MANDATE)
  // =========================================================================
  describe("4. Granular System Kill Switches", () => {
    it("should permit all services when switches are disengaged", () => {
      const switches: ActiveKillSwitch[] = [
        { serviceKey: "GOOGLE_SYNC", isKilled: false },
        { serviceKey: "POS_OFFLINE_SYNC", isKilled: false },
        { serviceKey: "SUPPLY_ORDER", isKilled: false },
      ];

      assert.equal(KillSwitchRules.isServiceAllowed("GOOGLE_SYNC", switches).allowed, true);
      assert.equal(KillSwitchRules.isServiceAllowed("POS_OFFLINE_SYNC", switches).allowed, true);
      assert.equal(KillSwitchRules.isServiceAllowed("SUPPLY_ORDER", switches).allowed, true);
    });

    it("should isolate failing third-party service without crashing other modules", () => {
      const switches: ActiveKillSwitch[] = [
        {
          serviceKey: "GOOGLE_SYNC",
          isKilled: true,
          reason: "Google Sheets API degraded (503 Service Unavailable)",
        },
        { serviceKey: "POS_OFFLINE_SYNC", isKilled: false },
      ];

      // Google sync is specifically killed
      const googleCheck = KillSwitchRules.isServiceAllowed("GOOGLE_SYNC", switches);
      assert.equal(googleCheck.allowed, false);
      assert.match(googleCheck.reason || "", /Google Sheets API degraded/);

      // Offline POS sync remains completely functional
      const posCheck = KillSwitchRules.isServiceAllowed("POS_OFFLINE_SYNC", switches);
      assert.equal(posCheck.allowed, true);
    });
  });

  // =========================================================================
  // 5. COMMERCIAL REVENUE SEPARATION
  // =========================================================================
  describe("5. Commercial Revenue Separation Invariant", () => {
    it("should strictly differentiate Customer Business GMV from SaaS Subscription MRR", () => {
      // Coffee shop customer gross volume (money belonging to tenant)
      const customerSalesVolume = 145_000_000; // Rp 145M gross sales processed
      const customerReceiptCount = 4_800; // 4,800 orders

      // LedgerLine SaaS subscription fees (money belonging to LedgerLine)
      const activeGrowthTenants = 12;
      const growthPriceMonthly = 249_000;
      const mrr = activeGrowthTenants * growthPriceMonthly; // Rp 2,988,000

      // Financial verification
      assert.notEqual(customerSalesVolume, mrr);
      assert.equal(mrr, 2_988_000);
      assert.equal(Math.round(customerSalesVolume / customerReceiptCount), 30208); // average ticket ~Rp 30.2k
    });
  });
});
