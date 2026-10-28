import { withTenant, prisma, PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { assertInvariant } from "../utils/invariants.ts";
import { validate } from "../utils/validate.ts";
import { z } from "zod";
import { validatePeriod } from "./period.service.ts";
import { sleep } from "../utils/sleep.ts";
import { createKitchenOrder, publishKitchenOrder } from "./kitchen.service.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";
import { roundMoney, balanceJournalLines, Decimal } from "../utils/money.ts";
import { reserveNumbers, markNumberUsed } from "./numbering.service.ts";
import { getBusinessDate } from "../utils/timezone.ts";
import { createId } from "@paralleldrive/cuid2";
import { PhysicalStockService } from "./physical-stock.service.ts";
import { calculateReceipt, ReceiptItemInput } from "../domain/pos/receipt.ts";
import { createRecipeSnapshot } from "../domain/recipe/snapshot.ts";

interface ModifierItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  reason: "extra" | "substitute" | "custom";
}

interface RecipeSnapshot {
  baseRecipeVersion: number;
  effectiveFrom: string;
  baseItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  modifiers: {
    additions: ModifierItem[];
    removals: ModifierItem[];
  };
  finalItems: Array<{ itemId: string; quantity: number; unit: string }>;
}

function compileFinalItems(snapshot: {
  baseItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  modifiers: {
    additions: ModifierItem[];
    removals: ModifierItem[];
  };
}): Array<{ itemId: string; quantity: number; unit: string }> {
  const map = new Map<
    string,
    { itemId: string; quantity: number; unit: string }
  >();
  for (const item of snapshot.baseItems) {
    map.set(item.itemId, { ...item, quantity: item.quantity });
  }
  for (const add of snapshot.modifiers.additions) {
    if (map.has(add.itemId)) {
      map.get(add.itemId)!.quantity += add.quantity;
    } else {
      map.set(add.itemId, {
        itemId: add.itemId,
        quantity: add.quantity,
        unit: add.unit,
      });
    }
  }
  for (const rem of snapshot.modifiers.removals) {
    if (map.has(rem.itemId)) {
      map.get(rem.itemId)!.quantity -= rem.quantity;
      if (map.get(rem.itemId)!.quantity < 0) map.get(rem.itemId)!.quantity = 0;
    }
  }
  return Array.from(map.values());
}

const MoneyStringSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v));

export const CheckoutPayloadSchema = z.object({
  tenantId: z.string(),
  outletId: z.string(),
  cashierId: z.string(),
  items: z
    .array(
      z.object({
        menuId: z.string(),
        quantity: z.number().int().positive(),
        discountAmount: z.number().min(0).default(0),
        note: z.string().max(200).optional(),
        modifiers: z
          .array(
            z.object({
              itemId: z.string(),
              quantity: z.number().positive().default(1),
              reason: z.enum(["extra", "substitute", "custom"]),
            }),
          )
          .optional(),
      }),
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "QRIS", "DEBIT", "CREDIT", "BANK_TRANSFER"]),
        amount: MoneyStringSchema,
      }),
    )
    .min(1),
  discountPercent: z.number().min(0).max(100).default(0),
  tipAmount: z.number().min(0).default(0).optional(),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().optional(),
  forceStock: z.boolean().default(false),
  skipPeriodValidation: z.boolean().default(false),
  originalBusinessDate: z.string().datetime().optional(),
  useHistoricalPrices: z.boolean().default(false),
});

export type TCheckoutPayload = z.input<typeof CheckoutPayloadSchema>;
export type TCheckoutValidated = z.output<typeof CheckoutPayloadSchema>;

export interface CheckoutResult {
  sale: any;
  kitchenOrder: any;
}

export async function checkout(
  input: TCheckoutPayload,
): Promise<CheckoutResult> {
  const validated = validate(CheckoutPayloadSchema, input);
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await withTenant(
        validated.tenantId,
        async (tx: PrismaTransaction) => {
          // ============================================================
          // STEP 0.5: IDEMPOTENCY GATE (dengan was_inserted & poison interception)
          // ============================================================
          if (validated.idempotencyKey) {
            await tx.idempotencyRecord.deleteMany({
              where: {
                key: validated.idempotencyKey,
                expiresAt: { lt: new Date() },
              },
            });

            const existing = await tx.idempotencyRecord.findUnique({
              where: { key: validated.idempotencyKey },
            });

            if (existing) {
              const parsed =
                typeof existing.responseBody === "string"
                  ? JSON.parse(existing.responseBody)
                  : existing.responseBody;

              if (parsed && parsed.error) {
                throw new LedgerError(
                  "IDEM-004",
                  `Idempotency key poisoned: ${parsed.error}`,
                );
              }
              if (
                existing.responseBody === '{"processing": true}' ||
                parsed?.processing
              ) {
                throw new LedgerError(
                  "IDEM-003",
                  "Transaction is still being processed. Please wait.",
                );
              }
              return parsed; // success response from previous attempt
            }

            await tx.idempotencyRecord.create({
              data: {
                key: validated.idempotencyKey,
                tenantId: validated.tenantId,
                statusCode: 200,
                responseBody: JSON.stringify({ processing: true }),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
          }

          // ============================================================
          // STEP 0.6: BUSINESS DATE — HANYA HARI INI (LATE ENTRY FIX)
          // ============================================================
          const tenant = await tx.tenant.findUnique({
            where: { id: validated.tenantId },
          });
          if (!tenant) throw new LedgerError("VAL-002", "Tenant not found");

          const rawDate = validated.originalBusinessDate
            ? new Date(validated.originalBusinessDate)
            : new Date();
          const businessDate = getBusinessDate(
            tenant.timezone || "Asia/Jakarta",
            rawDate,
          );

          // ============================================================
          // STEP 0.7: PERIOD VALIDATION
          // ============================================================
          if (!validated.skipPeriodValidation) {
            await validatePeriod(tx, validated.tenantId, businessDate);
          } else {
            console.warn(`⚠️ Late entry: skipping period validation`);
          }

          // ============================================================
          // STEP 1: TAX RATE
          // ============================================================
          const taxRate = await tx.taxRate.findFirst({
            where: {
              effectiveDate: { lte: businessDate },
              status: "ACTIVE",
              OR: [{ tenantId: validated.tenantId }, { tenantId: null }],
            },
            orderBy: [{ tenantId: "asc" }, { effectiveDate: "desc" }],
          });

          // Default to 0% tax if not configured yet for the tenant
          const taxRateDecimal = taxRate
            ? new Decimal(taxRate.rate.toString())
            : new Decimal(0);

          // ============================================================
          // STEP 2: MENU & RECIPE
          // ============================================================
          const menuIds = validated.items.map((i) => i.menuId);
          const menus = await tx.menu.findMany({
            where: {
              id: { in: menuIds },
              tenantId: validated.tenantId,
              isActive: true,
            },
            include: {
              recipes: {
                where: {
                  effectiveFrom: { lte: businessDate },
                  OR: [
                    { effectiveUntil: { gte: businessDate } },
                    { effectiveUntil: null },
                  ],
                },
                orderBy: { version: "desc" },
                take: 1,
                include: {
                  details: {
                    include: { item: { include: { unit: true } }, unit: true },
                  },
                },
              },
            },
          });

          if (menus.length !== new Set(menuIds).size) {
            throw new LedgerError(
              "VAL-002",
              "Menu not found for one or more items",
            );
          }

          // ============================================================
          // STEP 3: SUBTOTAL, RAW ITEMS, RECIPE SNAPSHOT (dengan batch modifier)
          // ============================================================
          let subtotal = new Decimal(0);
          const rawItems: {
            itemId: string;
            warehouseId: string;
            quantity: Decimal;
          }[] = [];
          const recipeSnapshots: any[] = [];

          const outlet = await tx.outlet.findUnique({
            where: { id: validated.outletId, tenantId: validated.tenantId },
            include: { defaultWarehouse: true },
          });

          if (!outlet) throw new LedgerError("VAL-002", "Outlet not found");
          if (!outlet.defaultWarehouseId) {
            throw new LedgerError("SYS-001", "Outlet has no default warehouse");
          }

          const warehouseId = outlet.defaultWarehouseId;

          // Batch query untuk modifier items
          const modifierItemIds: string[] = [];
          for (const item of validated.items) {
            if (item.modifiers) {
              for (const mod of item.modifiers) {
                modifierItemIds.push(mod.itemId);
              }
            }
          }

          const uniqueModifierIds = [...new Set(modifierItemIds)];
          const modifierItemsMap = new Map<string, any>();
          if (uniqueModifierIds.length > 0) {
            const modItems = await tx.item.findMany({
              where: { id: { in: uniqueModifierIds } },
              include: { unit: true },
            });
            for (const mi of modItems) {
              modifierItemsMap.set(mi.id, mi);
            }
          }

          for (const item of validated.items) {
            const menu = menus.find((m) => m.id === item.menuId);
            if (!menu)
              throw new LedgerError("VAL-002", `Menu ${item.menuId} not found`);

            const basePrice = new Decimal(menu.price.toString());
            const itemDiscount = new Decimal(item.discountAmount || 0);
            const finalPrice = basePrice.minus(itemDiscount).gte(0)
              ? basePrice.minus(itemDiscount)
              : new Decimal(0);
            const menuSubtotal = finalPrice.times(item.quantity);
            subtotal = subtotal.plus(menuSubtotal);

            let modifierSubtotal = new Decimal(0);
            const recipe = menu.recipes[0];
            if (!recipe)
              throw new LedgerError(
                "SYS-001",
                `Recipe not found for menu ${menu.id}`,
              );

            const baseItems = recipe.details.map((d) => ({
              itemId: d.itemId,
              name: d.item.name,
              quantity: Number(d.quantity),
              unit: d.unit.symbol,
            }));

            const additions: ModifierItem[] = [];
            const removals: ModifierItem[] = [];

            if (item.modifiers) {
              for (const mod of item.modifiers) {
                const modItem = modifierItemsMap.get(mod.itemId);
                if (!modItem)
                  throw new LedgerError(
                    "VAL-002",
                    `Modifier item ${mod.itemId} not found`,
                  );

                const modPrice = new Decimal(modItem.price.toString());
                modifierSubtotal = modifierSubtotal.plus(
                  modPrice.times(mod.quantity),
                );

                const entry: ModifierItem = {
                  itemId: modItem.id,
                  name: modItem.name,
                  price: Number(modItem.price),
                  quantity: mod.quantity,
                  unit: modItem.unit.symbol,
                  reason: mod.reason,
                };

                if (mod.reason === "substitute") {
                  removals.push(entry);
                } else {
                  additions.push(entry);
                }
              }
            }

            subtotal = subtotal.plus(modifierSubtotal);

            const snapshot: RecipeSnapshot = {
              baseRecipeVersion: recipe.version,
              effectiveFrom: recipe.effectiveFrom.toISOString(),
              baseItems,
              modifiers: { additions, removals },
              finalItems: compileFinalItems({
                baseItems,
                modifiers: { additions, removals },
              }),
            };

            const canonicalSnapshot = createRecipeSnapshot({
              tenantId: validated.tenantId,
              menuId: menu.id,
              menuName: menu.name,
              version: recipe.version,
              components: snapshot.finalItems.map((fi) => ({
                componentType: "MATERIAL",
                itemId: fi.itemId,
                itemName: baseItems.find((b) => b.itemId === fi.itemId)?.name || "Bahan",
                quantity: fi.quantity,
                unit: fi.unit,
                wastePercent: 0,
              })),
            });

            (snapshot as any).recipeHash = canonicalSnapshot.recipeHash;

            recipeSnapshots.push({ menuId: menu.id, snapshot });

            for (const finalItem of snapshot.finalItems) {
              rawItems.push({
                itemId: finalItem.itemId,
                warehouseId,
                quantity: new Decimal(finalItem.quantity).times(item.quantity),
              });
            }
          }

          // Group Raw Items
          const groupedRawItems = new Map<
            string,
            { itemId: string; warehouseId: string; quantity: Decimal }
          >();
          for (const raw of rawItems) {
            const key = `${raw.itemId}|${raw.warehouseId}`;
            if (groupedRawItems.has(key)) {
              groupedRawItems.get(key)!.quantity = groupedRawItems
                .get(key)!
                .quantity.plus(raw.quantity);
            } else {
              groupedRawItems.set(key, { ...raw, quantity: raw.quantity });
            }
          }

          let uniqueRawItems = Array.from(groupedRawItems.values());

          // ============================================================
          // STEP 3.6: SORTIR UNTUK CEGAH DEADLOCK (ADR-078)
          // ============================================================
          uniqueRawItems = uniqueRawItems.sort((a, b) =>
            a.itemId.localeCompare(b.itemId),
          );

          // BIZ-010: Per-Item Stock Opname Lock (Dokumen Teks Baru #12)
          const rawItemIds = uniqueRawItems.map((r) => r.itemId);
          if (rawItemIds.length > 0) {
            await PhysicalStockService.checkOpnamePending(tx, {
              tenantId: validated.tenantId,
              outletId: validated.outletId,
              warehouseId,
              itemIds: rawItemIds,
            });
          }

          // ============================================================
          // STEP 4: ATOMIC STOCK UPDATE dengan RETURNING — pakai .toString()::numeric
          // ============================================================
          const updatedBalances: {
            itemId: string;
            warehouseId: string;
            newStock: number;
          }[] = [];

          for (const raw of uniqueRawItems) {
            const stockResult = await PhysicalStockService.deductStock(tx, {
              tenantId: validated.tenantId,
              warehouseId: raw.warehouseId,
              itemId: raw.itemId,
              quantity: raw.quantity,
              reason: validated.forceStock ? "POS_SALE_FORCED" : "POS_SALE",
              forceStock: validated.forceStock,
            });
            updatedBalances.push({
              itemId: raw.itemId,
              warehouseId: raw.warehouseId,
              newStock: stockResult.newStock.toNumber(),
            });
          }

          // ============================================================
          // STEP 5: DISKON, PAJAK, SERVICE CHARGE, TOTAL (§8.9a Deterministic Receipt Engine)
          // ============================================================
          const receiptItems: ReceiptItemInput[] = validated.items.map((it) => {
            const m = menus.find((menu) => menu.id === it.menuId)!;
            const itemPrice = new Decimal(m.price.toString());
            const itemDiscount = it.discountAmount ? new Decimal(it.discountAmount.toString()) : new Decimal(0);
            return {
              menuId: it.menuId,
              menuName: m.name,
              unitPrice: itemPrice,
              qty: it.quantity,
              manualDiscount: itemDiscount.gt(0)
                ? { type: "AMOUNT", value: itemDiscount.mul(it.quantity) }
                : undefined,
            };
          });

          const cartDiscountInput = validated.discountPercent > 0
            ? { type: "PERCENT" as const, value: validated.discountPercent }
            : undefined;

          const tipAmount = validated.tipAmount
            ? new Decimal(validated.tipAmount.toString())
            : new Decimal(0);

          const calculatedReceipt = calculateReceipt({
            items: receiptItems,
            cartDiscount: cartDiscountInput,
            tenantSettings: {
              isTaxInclusive: tenant.isTaxInclusive || false,
              taxServiceChargeIncluded: (tenant as any).taxServiceChargeIncluded ?? true,
              serviceChargeRate: (tenant.serviceChargeRate || 0) / 100,
              taxRate: taxRateDecimal,
            },
            tipAmount: tipAmount,
          });

          const discountAmount = calculatedReceipt.totalLineDiscount.plus(calculatedReceipt.cartDiscountAmount);
          const afterDiscount = calculatedReceipt.netAfterDiscount;
          const tax = calculatedReceipt.taxAmount;
          const serviceCharge = calculatedReceipt.serviceChargeAmount;
          const total = calculatedReceipt.total;

          // ============================================================
          // STEP 5.5: PAYMENT VALIDATION — DENGAN EPSILON TOLERANCE (0.05)
          // ============================================================
          const totalPaid = validated.payments.reduce(
            (sum, p) => sum.plus(new Decimal(p.amount)),
            new Decimal(0),
          );
          const tolerance = new Decimal(0.05);
          assertInvariant(
            totalPaid.plus(tolerance).gte(total),
            "VAL-005",
            `Payment insufficient: ${totalPaid.toNumber()} < ${total.toNumber()}`,
          );

          // ============================================================
          // STEP 6: INVOICE NUMBER
          // ============================================================
          const [seq] = await reserveNumbers(tx, validated.tenantId, "INV", 1);
          const year = new Date().getFullYear().toString();
          const invoiceNumber = `INV-${year}-${String(seq).padStart(6, "0")}`;

          // ============================================================
          // STEP 7: SALES HEADER
          // ============================================================
          const sale = await tx.salesHeader.create({
            data: {
              tenantId: validated.tenantId,
              outletId: validated.outletId,
              warehouseId,
              invoiceNumber,
              businessDate,
              originalBusinessDate: validated.originalBusinessDate
                ? new Date(validated.originalBusinessDate)
                : null,
              cashierId: validated.cashierId,
              subtotal: subtotal.toNumber(),
              discount: discountAmount.toNumber(),
              tax: tax.toNumber(),
              serviceCharge: serviceCharge.toNumber(),
              totalAmount: total.toNumber(),
              status: validated.skipPeriodValidation ? "LATE_ENTRY" : "POSTED",
              idempotencyKey: validated.idempotencyKey,
              offlineId: null,
              totalHpp: 0,
              isHppCalculated: false,
              note: validated.note,
              metadata: JSON.stringify({
                originalBusinessDate: validated.originalBusinessDate || null,
                isLateEntry: validated.skipPeriodValidation || false,
                tipAmount: tipAmount.toNumber(),
              }),
            },
          });

          // ============================================================
          // STEP 8: SALES DETAILS — BULK CREATE dengan CUID MANUAL
          // ============================================================
          const costingMethod = tenant.plan === "cashier" ? "FIFO" : "AVERAGE";
          const detailsPayload = [];
          const detailIdMap: string[] = [];

          for (let idx = 0; idx < validated.items.length; idx++) {
            const item = validated.items[idx];
            const menu = menus.find((m) => m.id === item.menuId);
            if (!menu) throw new LedgerError("VAL-002");
            const recipe = menu.recipes[0];
            const snapshot = recipeSnapshots[idx]?.snapshot;
            const detailId = createId();
            detailIdMap.push(detailId);

            detailsPayload.push({
              id: detailId,
              salesId: sale.id,
              menuId: menu.id,
              recipeVersionId: recipe?.id,
              recipeSnapshot: snapshot ? JSON.stringify(snapshot) : null,
              menuNameSnapshot: menu.name,
              unitPriceSnapshot: Number(menu.price),
              quantity: item.quantity,
              totalPrice: new Decimal(menu.price.toString())
                .minus(new Decimal(item.discountAmount || 0))
                .gte(0)
                ? new Decimal(menu.price.toString())
                    .minus(new Decimal(item.discountAmount || 0))
                    .times(item.quantity)
                    .toNumber()
                : 0,
              hpp: 0,
              costingMethodSnapshot: costingMethod,
              hppStatus: "PENDING_ALLOCATION" as const,
              refundedQty: 0,
            });
          }

          await tx.salesDetail.createMany({ data: detailsPayload });

          // ============================================================
          // STEP 9: INVENTORY LEDGER — BULK CREATE
          // ============================================================
          const itemIds = uniqueRawItems.map((r) => r.itemId);
          const items = await tx.item.findMany({
            where: { id: { in: itemIds } },
            include: { unit: true },
          });
          const itemMap = new Map(items.map((i) => [i.id, i]));
          const ledgerPayload = [];

          for (const raw of uniqueRawItems) {
            const updated = updatedBalances.find(
              (u) =>
                u.itemId === raw.itemId && u.warehouseId === raw.warehouseId,
            );
            const balanceAfter = updated?.newStock || 0;
            const item = itemMap.get(raw.itemId);
            const unitSymbol = item?.unit?.symbol || "pcs";

            ledgerPayload.push({
              tenantId: validated.tenantId,
              outletId: validated.outletId,
              warehouseId: raw.warehouseId,
              itemId: raw.itemId,
              movementType: validated.forceStock
                ? "POS_SALE_FORCED"
                : "POS_SALE",
              referenceType: "SALES_ORDER",
              referenceId: sale.id,
              businessDate: businessDate,
              qtyIn: 0,
              qtyOut: raw.quantity.toNumber(),
              balanceAfter,
              unitCost: 0,
              costMethod: costingMethod,
              unitSnapshot: unitSymbol,
            });
          }

          await tx.inventoryLedger.createMany({ data: ledgerPayload });

          // ============================================================
          // STEP 10: JOURNAL ENTRY — dengan SERVICE_CHARGE & PEMBULATAN
          // ============================================================
          const existingAccounts = await tx.account.findMany({
            where: { tenantId: validated.tenantId },
          });

          // Helper to find or create system accounts
          const getOrCreateAccount = async (
            code: string,
            name: string,
            type: string,
            normalBalance: string,
          ) => {
            let acc = existingAccounts.find((a) => a.code === code);
            if (!acc) {
              acc = await tx.account.create({
                data: {
                  tenantId: validated.tenantId,
                  code,
                  name,
                  type,
                  normalBalance,
                },
              });
            }
            return acc;
          };

          const cashAccount = await getOrCreateAccount(
            "KAS",
            "Kas",
            "ASSET",
            "DEBIT",
          );
          const bankAccount = await getOrCreateAccount(
            "BANK",
            "Bank / Non-Tunai / QRIS",
            "ASSET",
            "DEBIT",
          );
          const revenueAccount = await getOrCreateAccount(
            "PENDAPATAN",
            "Pendapatan Penjualan",
            "REVENUE",
            "CREDIT",
          );
          const hppAccount = await getOrCreateAccount(
            "HPP",
            "Harga Pokok Penjualan",
            "EXPENSE",
            "DEBIT",
          );
          const inventoryAccount = await getOrCreateAccount(
            "PERSEDIAAN",
            "Persediaan Barang",
            "ASSET",
            "DEBIT",
          );
          const taxPayableAccount = await getOrCreateAccount(
            "PPN_KELUARAN",
            "Pajak Keluaran",
            "LIABILITY",
            "CREDIT",
          );
          const serviceChargeAccount = await getOrCreateAccount(
            "SERVICE_CHARGE",
            "Service Charge",
            "LIABILITY",
            "CREDIT",
          );
          const tipAccount = await getOrCreateAccount(
            "2020",
            "Utang Tip Karyawan",
            "LIABILITY",
            "CREDIT",
          );

          const [journalSeq] = await reserveNumbers(
            tx,
            validated.tenantId,
            "JRN",
            1,
          );
          const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

          const cashTotal = validated.payments
            .filter((p) => p.method === "CASH")
            .reduce(
              (sum, p) => sum.plus(new Decimal(p.amount)),
              new Decimal(0),
            );
          const digitalTotal = validated.payments
            .filter((p) => p.method !== "CASH")
            .reduce(
              (sum, p) => sum.plus(new Decimal(p.amount)),
              new Decimal(0),
            );

          const revenueCredit = tenant.isTaxInclusive
            ? afterDiscount.minus(tax)
            : afterDiscount;

          let lines = [
            {
              accountId: revenueAccount.id,
              debit: new Decimal(0),
              credit: revenueCredit,
            },
            {
              accountId: hppAccount.id,
              debit: new Decimal(0),
              credit: new Decimal(0),
            },
            {
              accountId: inventoryAccount.id,
              debit: new Decimal(0),
              credit: new Decimal(0),
            },
            {
              accountId: taxPayableAccount.id,
              debit: new Decimal(0),
              credit: tax,
            },
            {
              accountId: serviceChargeAccount.id,
              debit: new Decimal(0),
              credit: serviceCharge,
            },
          ];

          if (cashTotal.greaterThan(0)) {
            lines.push({
              accountId: cashAccount.id,
              debit: cashTotal,
              credit: new Decimal(0),
            });
          }
          if (digitalTotal.greaterThan(0)) {
            lines.push({
              accountId: bankAccount.id,
              debit: digitalTotal,
              credit: new Decimal(0),
            });
          }
          if (tipAmount.greaterThan(0)) {
            lines.push({
              accountId: tipAccount.id,
              debit: new Decimal(0),
              credit: tipAmount,
            });
          }

          lines = balanceJournalLines(lines);

          const journal = await tx.journalEntry.create({
            data: {
              tenantId: validated.tenantId,
              entryNumber: journalNumber,
              entryDate: businessDate,
              referenceType: "SALE",
              referenceId: sale.id,
              description: `Penjualan ${invoiceNumber}`,
              status: "POSTED",
              lines: {
                create: lines.map((l) => ({
                  accountId: l.accountId,
                  debit: l.debit.toNumber(),
                  credit: l.credit.toNumber(),
                })),
              },
            },
          });

          const createdLines = await tx.journalLine.findMany({
            where: { journalEntryId: journal.id },
            include: { account: true },
          });

          let hppLineId: string | null = null;
          let inventoryLineId: string | null = null;
          for (const line of createdLines) {
            if (line.account.code === "HPP") hppLineId = line.id;
            if (line.account.code === "PERSEDIAAN") inventoryLineId = line.id;
          }

          await tx.salesHeader.update({
            where: { id: sale.id },
            data: {
              hppJournalLineId: hppLineId,
              inventoryJournalLineId: inventoryLineId,
            },
          });

          // ============================================================
          // STEP 11: COST ALLOCATION
          // ============================================================
          const allocations = [];
          for (let i = 0; i < validated.items.length; i++) {
            const item = validated.items[i];
            const detailId = detailIdMap[i];
            const menu = menus.find((m) => m.id === item.menuId);
            const recipe = menu?.recipes[0];
            if (recipe) {
              for (const recipeDetail of recipe.details) {
                allocations.push({
                  salesDetailId: detailId,
                  itemId: recipeDetail.itemId,
                  quantity: new Decimal(recipeDetail.quantity.toString()).times(
                    item.quantity,
                  ),
                  warehouseId: warehouseId,
                });
              }
            }
          }

          if (tenant.plan === "cashier") {
            await tx.fifoAllocationJob.create({
              data: {
                tenantId: validated.tenantId,
                salesId: sale.id,
                allocations: allocations as any,
                status: "PENDING",
              },
            });
            await tx.outbox.create({
              data: {
                tenantId: validated.tenantId,
                eventType: "FifoAllocationJob",
                payload: JSON.stringify({
                  salesId: sale.id,
                  jobType: "FIFO_ALLOCATION",
                }),
              },
            });
          } else {
            const engine = await CostEngineFactory.getEngine(
              validated.tenantId,
            );
            const hppResult = await engine.allocateSalesCost(
              allocations,
              sale.id,
              validated.tenantId,
              validated.outletId,
              tx,
            );

            await tx.salesHeader.update({
              where: { id: sale.id },
              data: {
                totalHpp: hppResult.totalHpp.toNumber(),
                isHppCalculated: true,
              },
            });

            if (hppLineId && inventoryLineId) {
              await tx.journalLine.update({
                where: { id: hppLineId },
                data: { debit: hppResult.totalHpp.toNumber() },
              });
              await tx.journalLine.update({
                where: { id: inventoryLineId },
                data: { credit: hppResult.totalHpp.toNumber() },
              });
            }
          }

          // ============================================================
          // STEP 12: PAYMENTS
          // ============================================================
          for (const payment of validated.payments) {
            await tx.payment.create({
              data: {
                salesId: sale.id,
                method: payment.method,
                amount: new Decimal(payment.amount).toNumber(),
                status: "PAID",
              },
            });
          }

          // ============================================================
          // STEP 13: AUDIT LOG
          // ============================================================
          await tx.auditLog.create({
            data: {
              tenantId: validated.tenantId,
              userId: validated.cashierId,
              action: "SALE",
              severity: "info",
              metadata: JSON.stringify({
                invoiceNumber,
                total: total.toNumber(),
                isLateEntry: validated.skipPeriodValidation || false,
              }),
            },
          });

          await markNumberUsed(tx, validated.tenantId, invoiceNumber);

          // ============================================================
          // STEP 14: OUTBOX
          // ============================================================
          await tx.outbox.create({
            data: {
              tenantId: validated.tenantId,
              eventType: "SaleCreated",
              payload: JSON.stringify({
                saleId: sale.id,
                total: total.toNumber(),
                invoice: invoiceNumber,
                tenantId: validated.tenantId,
                outletId: validated.outletId,
                offlineId: null,
                isLateEntry: validated.skipPeriodValidation || false,
              }),
            },
          });

          // ============================================================
          // STEP 15: KITCHEN DISPLAY ORDER — TANPA REDIS PUBLISH
          // ============================================================
          const kitchenOrder = await createKitchenOrder(
            tx,
            sale.id,
            validated.outletId,
          );

          // ============================================================
          // STEP 16: IDEMPOTENCY UPDATE
          // ============================================================
          if (validated.idempotencyKey) {
            await tx.idempotencyRecord.upsert({
              where: { key: validated.idempotencyKey },
              update: {
                statusCode: 200,
                responseBody: JSON.stringify({ sale, kitchenOrder }),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              create: {
                key: validated.idempotencyKey,
                tenantId: validated.tenantId,
                statusCode: 200,
                responseBody: JSON.stringify({ sale, kitchenOrder }),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
          }

          return { sale, kitchenOrder };
        },
      );

      // ============================================================
      // ✅ FIX: KDS Publish Guarantee — publish setelah transaksi commit
      // ============================================================
      if (result.kitchenOrder) {
        const outletId = result.sale.outletId;
        await publishKitchenOrder(outletId, result.kitchenOrder);
      }

      return result;
    } catch (error: any) {
      // ============================================================
      // IDEMPOTENCY POISON — UPDATE untuk SEMUA error
      // ============================================================
      if (validated.idempotencyKey) {
        try {
          await prisma.idempotencyRecord.update({
            where: { key: validated.idempotencyKey },
            data: {
              responseBody: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          });
        } catch {
          // ignore if idempotency record wasn't created yet
        }
      }

      if (
        error instanceof LedgerError &&
        (error.code === "LOCK_001" || error.code === "LOCK-001") &&
        attempt < MAX_RETRIES
      ) {
        const delay = Math.pow(2, attempt) * 50 + Math.random() * 50;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new LedgerError(
    "SYS-002",
    "Max retries exceeded for Optimistic Locking.",
  );
}
