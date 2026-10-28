import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EntitlementRules, TenantSubscriptionState } from "../domain/saas/entitlements.ts";

describe("Phase 9: SaaS Entitlement & Subscription Domain Engine", () => {
  const coreState: TenantSubscriptionState = {
    status: "ACTIVE",
    planCode: "CORE",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    entitlements: {
      MAX_OUTLETS: "1",
      MAX_USERS: "5",
      MAX_DEVICES: "2",
      GOOGLE_SHEETS: "false",
      MULTI_OUTLET: "false",
      STOCK_TRANSFER: "false",
      ADVANCED_APPROVAL: "false",
      DECISION_ENGINE: "basic",
    },
  };

  const growthState: TenantSubscriptionState = {
    status: "ACTIVE",
    planCode: "GROWTH",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    entitlements: {
      MAX_OUTLETS: "3",
      MAX_USERS: "20",
      MAX_DEVICES: "10",
      GOOGLE_SHEETS: "true",
      MULTI_OUTLET: "true",
      STOCK_TRANSFER: "true",
      ADVANCED_APPROVAL: "true",
      DECISION_ENGINE: "advanced",
    },
  };

  it("should deny Google Sheets live mirror on Core plan but allow on Growth plan", () => {
    const coreCheck = EntitlementRules.canAccessFeature(coreState, "GOOGLE_SHEETS");
    assert.equal(coreCheck.allowed, false);
    assert.match(coreCheck.reason || "", /tidak termasuk dalam paket CORE/);

    const growthCheck = EntitlementRules.canAccessFeature(growthState, "GOOGLE_SHEETS");
    assert.equal(growthCheck.allowed, true);
    assert.equal(growthCheck.reason, undefined);
  });

  it("should enforce outlet capacity limit deterministically", () => {
    // Core limit is 1
    const allowedAddFirst = EntitlementRules.checkCapacityLimit(coreState, "MAX_OUTLETS", 0);
    assert.equal(allowedAddFirst.allowed, true);

    const denyAddSecond = EntitlementRules.checkCapacityLimit(coreState, "MAX_OUTLETS", 1);
    assert.equal(denyAddSecond.allowed, false);
    assert.match(denyAddSecond.reason || "", /Batas kapasitas MAX_OUTLETS untuk paket CORE \(1\) telah tercapai/);

    // Growth limit is 3
    const allowedGrowthThird = EntitlementRules.checkCapacityLimit(growthState, "MAX_OUTLETS", 2);
    assert.equal(allowedGrowthThird.allowed, true);

    const denyGrowthFourth = EntitlementRules.checkCapacityLimit(growthState, "MAX_OUTLETS", 3);
    assert.equal(denyGrowthFourth.allowed, false);
    assert.match(denyGrowthFourth.reason || "", /Batas kapasitas MAX_OUTLETS untuk paket GROWTH \(3\) telah tercapai/);
  });

  it("should block all operations when subscription is CANCELED (Archive Mode)", () => {
    const canceledState: TenantSubscriptionState = {
      ...growthState,
      status: "CANCELED",
    };

    const res = EntitlementRules.canAccessFeature(canceledState, "GOOGLE_SHEETS");
    assert.equal(res.allowed, false);
    assert.match(res.reason || "", /Langganan telah berakhir/);
  });

  it("should allow basic device capacity in RESTRICTED mode but block advanced features", () => {
    const restrictedState: TenantSubscriptionState = {
      ...growthState,
      status: "RESTRICTED",
    };

    const deviceCheck = EntitlementRules.canAccessFeature(restrictedState, "MAX_DEVICES");
    assert.equal(deviceCheck.allowed, true);

    const advancedCheck = EntitlementRules.canAccessFeature(restrictedState, "ADVANCED_APPROVAL");
    assert.equal(advancedCheck.allowed, false);
    assert.match(advancedCheck.reason || "", /RESTRICTED/);
  });

  it("should calculate deterministic health score accurately", () => {
    // 100% healthy
    const healthy = EntitlementRules.calculateTenantHealthScore({
      hasActiveSubscription: true,
      reconciliationFailed: false,
      hasUnclosedOldShift: false,
      hasPendingOfflineTx: false,
      hasGoogleSyncError: false,
      lastBackupHealthy: true,
    });
    assert.equal(healthy.score, 100);
    assert.equal(healthy.status, "HEALTHY");
    assert.equal(healthy.deductions.length, 0);

    // Critical: reconciliation failed (-35) + non-active subscription (-25) = 40 (CRITICAL)
    const critical = EntitlementRules.calculateTenantHealthScore({
      hasActiveSubscription: false,
      reconciliationFailed: true,
      hasUnclosedOldShift: false,
      hasPendingOfflineTx: false,
      hasGoogleSyncError: false,
      lastBackupHealthy: true,
    });
    assert.equal(critical.score, 40);
    assert.equal(critical.status, "CRITICAL");
    assert.equal(critical.deductions.length, 2);
  });
});
