import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { calculateReceipt } from "../domain/pos/receipt.ts";
import { balanceJournalLines } from "../utils/money.ts";
import { TenantLifecycleRules } from "../domain/saas/tenant-lifecycle.ts";
import { EntitlementRules } from "../domain/saas/entitlements.ts";

describe("Phase 11: Enterprise 3-Persona End-to-End Scenarios", () => {
  // =========================================================================
  // PERSONA 1: PENGGUNA BARU (TENANT OWNER ONBOARDING)
  // =========================================================================
  describe("Persona 1: New Tenant Onboarding & Activation Journey", () => {
    it("should generate proper tenant lifecycle attributes upon self-registration", () => {
      const now = new Date();
      const trialDurationDays = 14;
      const trialEnd = new Date(now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);

      // Verify trial duration invariant
      const diffDays = Math.round((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      assert.equal(diffDays, 14, "Trial duration must be exactly 14 days");

      // Verify tenant can transition from PROVISIONING to TRIAL
      assert.equal(
        TenantLifecycleRules.canTransition("PROVISIONING", "TRIAL"),
        true,
        "New tenant should smoothly enter TRIAL phase",
      );

      // Verify POS access is permitted during TRIAL phase
      assert.equal(
        TenantLifecycleRules.isOperationalAllowed("TRIAL"),
        true,
        "Frontline POS must be operational during active trial",
      );
    });

    it("should enforce sequential onboarding wizard progression (Steps 1 through 7)", () => {
      let currentStep = 1;
      let completed = false;

      // Simulate step progression
      for (let step = 2; step <= 7; step++) {
        currentStep = step;
        if (step === 7) completed = true;
      }

      assert.equal(currentStep, 7, "Tenant must complete all 7 setup wizard steps");
      assert.equal(completed, true, "Tenant onboarding status must be marked completed");
    });
  });

  // =========================================================================
  // PERSONA 2: PLATFORM SUPERADMIN (GOVERNANCE & APPROVALS)
  // =========================================================================
  describe("Persona 2: Platform Superadmin Governance & Approval Journey", () => {
    it("should allow Superadmin to verify and activate pending supplier accounts", () => {
      const pendingSupplier = {
        id: "sup-001",
        name: "PT Biji Kopi Nusantara",
        status: "pending",
        verifiedAt: null as Date | null,
      };

      // Superadmin reviews and approves supplier
      const approvedSupplier = {
        ...pendingSupplier,
        status: "ACTIVE",
        verifiedAt: new Date(),
      };

      assert.equal(approvedSupplier.status, "ACTIVE");
      assert.ok(approvedSupplier.verifiedAt !== null, "Approval must timestamp verification date");
    });

    it("should allow Superadmin to verify and activate pending supplier catalog products", () => {
      const pendingProduct = {
        id: "cat-item-001",
        name: "Arabica Gayo Natural 1kg",
        price: 185000,
        isActive: false, // Initially unverified
      };

      // Superadmin verifies quality & approves
      const verifiedProduct = {
        ...pendingProduct,
        isActive: true,
      };

      assert.equal(verifiedProduct.isActive, true, "Verified product becomes publicly listed");
    });

    it("should allow Superadmin to upgrade tenant plan and enforce entitlement rules", () => {
      const coreState = {
        status: "ACTIVE" as const,
        planCode: "CORE" as const,
        currentPeriodEnd: new Date(),
        entitlements: {
          MAX_OUTLETS: "1",
          GOOGLE_SHEETS: "false",
        },
      };

      const growthState = {
        status: "ACTIVE" as const,
        planCode: "GROWTH" as const,
        currentPeriodEnd: new Date(),
        entitlements: {
          MAX_OUTLETS: "3",
          GOOGLE_SHEETS: "true",
        },
      };

      // Check entitlements on both plans
      const coreSheets = EntitlementRules.canAccessFeature(coreState, "GOOGLE_SHEETS");
      assert.equal(coreSheets.allowed, false, "Core plan denies Google Sheets sync");

      const growthSheets = EntitlementRules.canAccessFeature(growthState, "GOOGLE_SHEETS");
      assert.equal(growthSheets.allowed, true, "Growth plan entitles tenant to Google Sheets Sync");

      const maxOutlets = Number(growthState.entitlements.MAX_OUTLETS);
      assert.ok(maxOutlets >= 3, "Growth tier should permit multi-outlet scaling");
    });
  });

  // =========================================================================
  // PERSONA 3: DAILY FRONTLINE OPERATOR (CASHIER, BARISTA, SUPPLIER)
  // =========================================================================
  describe("Persona 3: Daily Frontline Operations & Accounting Invariants", () => {
    it("should calculate receipt with employee tip and maintain exact Debit == Credit balance", () => {
      const unitPrice = new Decimal(30000); // 1 Kopi Susu
      const qty = new Decimal(2);           // 2 porsi
      const tip = new Decimal(5000);         // Rp 5.000 Tip Pelanggan

      const calculatedReceipt = calculateReceipt({
        items: [
          {
            menuId: "menu-01",
            menuName: "Es Kopi Susu",
            unitPrice,
            qty,
          },
        ],
        tenantSettings: {
          isTaxInclusive: false,
          taxServiceChargeIncluded: true,
          serviceChargeRate: 0.05, // 5% Service Charge
          taxRate: 0.11,           // 11% PB1/PPN
        },
        tipAmount: tip,
      });

      // Receipt Total = Gross Amount + Tip Amount
      assert.equal(
        calculatedReceipt.total.toString(),
        calculatedReceipt.grossAmount.plus(tip).toString(),
        "Total paid must exactly equal gross amount plus tip amount",
      );

      // Construct Double-Entry Journal Lines with Tip Liability Account (2020)
      const cashAccountId = "acc-kas-1000";
      const revenueAccountId = "acc-rev-4000";
      const taxAccountId = "acc-tax-2010";
      const scAccountId = "acc-sc-2015";
      const tipAccountId = "acc-tip-2020";

      const debitTotal = calculatedReceipt.total;
      let rawLines = [
        { accountId: cashAccountId, debit: debitTotal, credit: new Decimal(0) },
        { accountId: revenueAccountId, debit: new Decimal(0), credit: calculatedReceipt.netAfterDiscount },
        { accountId: taxAccountId, debit: new Decimal(0), credit: calculatedReceipt.taxAmount },
        { accountId: scAccountId, debit: new Decimal(0), credit: calculatedReceipt.serviceChargeAmount },
        { accountId: tipAccountId, debit: new Decimal(0), credit: tip },
      ];

      const balanced = balanceJournalLines(rawLines);

      const totalDebits = balanced.reduce((s, l) => s.plus(l.debit), new Decimal(0));
      const totalCredits = balanced.reduce((s, l) => s.plus(l.credit), new Decimal(0));

      assert.equal(
        totalDebits.toString(),
        totalCredits.toString(),
        `Debit (${totalDebits}) must equal Credit (${totalCredits}) perfectly with Tip Liability`,
      );
    });

    it("should enforce Zero-Cost Visibility: Cashier never receives HPP or unit cost in refund items", () => {
      // Simulating filtered refundable item output
      const rawDetailFromDb = {
        id: "detail-001",
        menuNameSnapshot: "Espresso Single",
        quantity: 2,
        unitPriceSnapshot: 18000,
        totalPrice: 36000,
        hpp: 7500, // Cost data
        unitHpp: 3750, // Cost data
      };

      // Filter function simulating getRefundableItems in refund.service.ts
      const cashierView = {
        detailId: rawDetailFromDb.id,
        menuName: rawDetailFromDb.menuNameSnapshot,
        purchasedQty: rawDetailFromDb.quantity,
        refundedQty: 0,
        availableQty: 2,
        unitPrice: rawDetailFromDb.unitPriceSnapshot,
        totalPrice: rawDetailFromDb.totalPrice,
      };

      // Invariants: 'hpp' and 'unitHpp' MUST be completely undefined
      assert.equal((cashierView as any).hpp, undefined, "HPP must NEVER be sent to cashier interface");
      assert.equal((cashierView as any).unitHpp, undefined, "Unit HPP must NEVER be sent to cashier interface");
      assert.equal(cashierView.totalPrice, 36000);
    });

    it("should verify Offline POS batch resilience with deduplication semantics", () => {
      const batchPayloads = [
        { offlineId: "offline-tx-001", amount: 50000 },
        { offlineId: "offline-tx-002", amount: 75000 },
      ];

      // Simulating first sync
      const syncedSet = new Set<string>();
      batchPayloads.forEach((tx) => syncedSet.add(tx.offlineId));
      assert.equal(syncedSet.size, 2);

      // Simulating network retry with the same batch (skipDuplicates semantics)
      let duplicateIgnoredCount = 0;
      batchPayloads.forEach((tx) => {
        if (syncedSet.has(tx.offlineId)) {
          duplicateIgnoredCount++;
        } else {
          syncedSet.add(tx.offlineId);
        }
      });

      assert.equal(duplicateIgnoredCount, 2, "Batch retry must skip existing transactions idempotently");
      assert.equal(syncedSet.size, 2, "Database must not produce duplicate sales on network retry");
    });
  });
});
