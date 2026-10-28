import { withTenant, prisma, PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { assertInvariant } from "../utils/invariants.ts";
import { validate } from "../utils/validate.ts";
import { z } from "zod";
import { Decimal, roundMoney, balanceJournalLines } from "../utils/money.ts";
import { reserveNumbers } from "./numbering.service.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";
import { updateKitchenOrderQuantity } from "./kitchen.service.ts";

export const RefundPayloadSchema = z.object({
  tenantId: z.string(),
  salesId: z.string(),
  cashierId: z.string(),
  outletId: z.string(),
  items: z
    .array(
      z.object({
        salesDetailId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  reason: z.string().min(1).max(500),
  refundMethod: z
    .enum(["CASH", "QRIS", "DEBIT", "CREDIT", "BANK_TRANSFER"])
    .default("CASH"),
});

export type TRefundPayload = z.infer<typeof RefundPayloadSchema>;

export async function processRefund(input: TRefundPayload) {
  const validated = validate(RefundPayloadSchema, input);

  return await withTenant(validated.tenantId, async (tx: PrismaTransaction) => {
    const originalSale = await tx.salesHeader.findUnique({
      where: {
        id: validated.salesId,
        status: { in: ["POSTED", "LATE_ENTRY"] },
      },
      include: {
        details: {
          include: { menu: true },
        },
        outlet: {
          include: { defaultWarehouse: true },
        },
        payments: true,
      },
    });

    if (!originalSale) throw new LedgerError("VAL-002", "Sale not found");

    const daysSinceSale =
      (Date.now() - originalSale.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    assertInvariant(
      daysSinceSale <= 7,
      "REF-001",
      `Refund only within 7 days. Age: ${daysSinceSale.toFixed(1)} days.`,
    );

    if (!originalSale.isHppCalculated) {
      throw new LedgerError(
        "REF-004",
        "Refund cannot be processed because HPP is not yet calculated.",
      );
    }

    let refundSubtotal = new Decimal(0);
    let refundHpp = new Decimal(0);
    const refundItems: any[] = [];

    for (const item of validated.items) {
      const detail = await tx.salesDetail.findUnique({
        where: { id: item.salesDetailId, salesId: validated.salesId },
        include: { menu: true },
      });

      if (!detail) throw new LedgerError("VAL-002", "Sales detail not found");

      const unitPrice = new Decimal(detail.unitPriceSnapshot.toString());
      const itemSubtotal = unitPrice.times(item.quantity);
      refundSubtotal = refundSubtotal.plus(itemSubtotal);

      const totalDetailHpp = new Decimal(
        detail.hpp ? detail.hpp.toString() : 0,
      );
      const unitHpp = detail.quantity > 0
        ? totalDetailHpp.dividedBy(detail.quantity)
        : new Decimal(0);
      const hppRefund = roundMoney(unitHpp.times(item.quantity));
      refundHpp = refundHpp.plus(hppRefund);

      refundItems.push({
        detail,
        quantity: item.quantity,
        itemSubtotal,
        hppRefund,
        unitHpp,
      });

      // Atomic check and increment of refunded_qty
      const sd = await tx.salesDetail.findUnique({
        where: { id: item.salesDetailId },
      });
      if (!sd || sd.quantity - sd.refundedQty < item.quantity) {
        throw new LedgerError(
          "REF-002",
          "Double refund detected / Quantity exceeds available",
        );
      }
      await tx.salesDetail.update({
        where: { id: sd.id },
        data: { refundedQty: { increment: item.quantity } },
      });
    }

    const totalSubtotal = new Decimal(originalSale.subtotal.toString());
    const totalDiscount = new Decimal(
      originalSale.discount ? originalSale.discount.toString() : 0,
    );
    const totalTax = new Decimal(
      originalSale.tax ? originalSale.tax.toString() : 0,
    );
    const totalService = new Decimal(
      originalSale.serviceCharge ? originalSale.serviceCharge.toString() : 0,
    );

    // Division by zero protection on discount ratio
    const discountRatio = totalSubtotal.greaterThan(0)
      ? refundSubtotal.dividedBy(totalSubtotal)
      : new Decimal(0);

    const roundedRefundDiscount = roundMoney(
      totalDiscount.times(discountRatio),
    );
    const roundedRefundTax = roundMoney(totalTax.times(discountRatio));
    const roundedRefundService = roundMoney(totalService.times(discountRatio));
    const roundedRefundSubtotal = roundMoney(refundSubtotal);

    const refundTotal = roundedRefundSubtotal
      .minus(roundedRefundDiscount)
      .plus(roundedRefundTax)
      .plus(roundedRefundService);

    let returnOrder = await tx.returnOrder.create({
      data: {
        tenantId: validated.tenantId,
        originalSalesId: validated.salesId,
        outletId: validated.outletId,
        cashierId: validated.cashierId,
        refundReason: validated.reason,
        refundMethod: validated.refundMethod,
        status: "PENDING",
        totalRefund: refundTotal.toNumber(),
      },
    });

    const engine = await CostEngineFactory.getEngine(validated.tenantId);

    for (const rd of refundItems) {
      let refundAmountProRata: Decimal;
      if (refundSubtotal.isZero()) {
        refundAmountProRata = new Decimal(0);
      } else {
        refundAmountProRata = refundTotal.times(
          rd.itemSubtotal.dividedBy(refundSubtotal),
        );
      }

      const rawSnapshot = rd.detail.recipeSnapshot as any;
      const snapshot = typeof rawSnapshot === "string" ? JSON.parse(rawSnapshot) : rawSnapshot;
      const targetItemId = snapshot?.finalItems?.[0]?.itemId ||
        (await tx.item.findFirst({ where: { tenantId: validated.tenantId } }))?.id;

      await tx.returnDetail.create({
        data: {
          returnOrderId: returnOrder.id,
          salesDetailId: rd.detail.id,
          itemId: targetItemId,
          quantity: rd.quantity,
          refundAmount: refundAmountProRata.toNumber(),
          hppRefund: rd.hppRefund.toNumber(),
          menuNameSnapshot: rd.detail.menuNameSnapshot,
        },
      });
      const warehouseId =
        originalSale.warehouseId || originalSale.outlet?.defaultWarehouseId;

      if (snapshot && snapshot.finalItems && warehouseId) {
        for (const finalItem of snapshot.finalItems) {
          const qty = new Decimal(finalItem.quantity).times(rd.quantity);
          await engine.adjustStock(
            {
              itemId: finalItem.itemId,
              quantity: qty,
              warehouseId,
              reason: `REFUND_${returnOrder.id}`,
              unitCost: rd.unitHpp,
            },
            validated.tenantId,
            tx,
          );
        }
      }
    }

    returnOrder = await tx.returnOrder.update({
      where: { id: returnOrder.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Accounting Reversing Entries
    const accounts = await tx.account.findMany({
      where: { tenantId: validated.tenantId },
    });

    const getOrCreateAccount = async (
      code: string,
      name: string,
      type: string,
      normalBalance: string,
    ) => {
      let acc = accounts.find((a) => a.code === code);
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

    const [journalSeq] = await reserveNumbers(tx, validated.tenantId, "JRN", 1);
    const year = new Date().getFullYear().toString();
    const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

    let lines = [
      {
        accountId: revenueAccount.id,
        debit: roundedRefundSubtotal.minus(roundedRefundDiscount),
        credit: new Decimal(0),
      },
      {
        accountId: taxPayableAccount.id,
        debit: roundedRefundTax,
        credit: new Decimal(0),
      },
      {
        accountId: serviceChargeAccount.id,
        debit: roundedRefundService,
        credit: new Decimal(0),
      },
      { accountId: hppAccount.id, debit: new Decimal(0), credit: refundHpp },
      {
        accountId: inventoryAccount.id,
        debit: refundHpp,
        credit: new Decimal(0),
      },
      {
        accountId:
          validated.refundMethod === "CASH"
            ? cashAccount.id
            : bankAccount.id,
        debit: new Decimal(0),
        credit: refundTotal,
      },
    ];

    lines = balanceJournalLines(lines);

    await tx.journalEntry.create({
      data: {
        tenantId: validated.tenantId,
        entryNumber: journalNumber,
        entryDate: new Date(),
        referenceType: "REFUND",
        referenceId: returnOrder.id,
        description: `Partial refund (pro-rata) for ${originalSale.invoiceNumber}`,
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

    // Update Kitchen Order quantities
    const kitchenRefundItems = await Promise.all(
      validated.items.map(async (item) => {
        const detail = await tx.salesDetail.findUnique({
          where: { id: item.salesDetailId },
        });
        return {
          menuName: detail?.menuNameSnapshot || "",
          quantity: item.quantity,
        };
      }),
    );
    await updateKitchenOrderQuantity(validated.salesId, kitchenRefundItems, tx);

    await tx.auditLog.create({
      data: {
        tenantId: validated.tenantId,
        userId: validated.cashierId,
        action: "PARTIAL_REFUND",
        severity: "info",
        metadata: JSON.stringify({
          salesId: validated.salesId,
          returnOrderId: returnOrder.id,
          refundAmount: refundTotal.toNumber(),
          refundMethod: validated.refundMethod,
          roundedRefundSubtotal: roundedRefundSubtotal.toNumber(),
          roundedRefundDiscount: roundedRefundDiscount.toNumber(),
          roundedRefundTax: roundedRefundTax.toNumber(),
          roundedRefundService: roundedRefundService.toNumber(),
          refundHpp: refundHpp.toNumber(),
        }),
      },
    });

    return returnOrder;
  });
}

export async function getRefundableItems(salesId: string, tenantId: string) {
  const sale = await prisma.salesHeader.findUnique({
    where: { id: salesId, tenantId, status: { in: ["POSTED", "LATE_ENTRY"] } },
    include: {
      details: {
        include: { menu: true },
      },
    },
  });

  if (!sale) throw new LedgerError("VAL-002", "Sale not found");

  const refundedDetails = await prisma.returnDetail.findMany({
    where: {
      returnOrder: {
        originalSalesId: salesId,
        status: "COMPLETED",
      },
    },
    select: { salesDetailId: true, quantity: true },
  });

  const refundedMap = new Map<string, number>();
  for (const rd of refundedDetails) {
    refundedMap.set(
      rd.salesDetailId,
      (refundedMap.get(rd.salesDetailId) || 0) + rd.quantity,
    );
  }

  return sale.details.map((detail) => {
    const refundedQty = refundedMap.get(detail.id) || 0;
    const availableQty = Math.max(0, detail.quantity - refundedQty);
    return {
      detailId: detail.id,
      menuName: detail.menu?.name || detail.menuNameSnapshot,
      purchasedQty: detail.quantity,
      refundedQty,
      availableQty,
      unitPrice: Number(detail.unitPriceSnapshot),
      totalPrice: Number(detail.totalPrice),
    };
  });
}
