import { prisma } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { Decimal } from "../utils/money.ts";
import { reserveNumbers } from "./numbering.service.ts";

export class AttendanceService {
  async openShift(cashierId: string, outletId: string) {
    const user = await prisma.userProfile.findFirst({
      where: { userId: cashierId },
      select: { tenantId: true },
    });

    if (!user || !user.tenantId)
      throw new LedgerError("VAL-002", "User profile not found");

    const openShift = await prisma.shift.findFirst({
      where: {
        cashierId,
        status: "open",
      },
    });

    if (openShift)
      throw new LedgerError(
        "SYS-001",
        "A shift is already open for this cashier",
      );

    return prisma.shift.create({
      data: {
        tenantId: user.tenantId,
        outletId,
        cashierId,
        startTime: new Date(),
        status: "open",
      },
    });
  }

  async closeShift(shiftId: string, actualCashInput: Decimal | number) {
    const actualCash = new Decimal(actualCashInput);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) throw new LedgerError("VAL-002", "Shift not found");
    if (shift.status !== "open")
      throw new LedgerError("SYS-001", "Shift already closed");

    const now = new Date();

    const salesInShift = await prisma.salesHeader.findMany({
      where: {
        tenantId: shift.tenantId,
        outletId: shift.outletId,
        cashierId: shift.cashierId,
        status: { in: ["POSTED", "LATE_ENTRY"] },
        createdAt: {
          gte: shift.startTime,
          lte: now,
        },
      },
      include: { payments: true },
    });

    let expectedCash = salesInShift.reduce((sum, sale) => {
      const cashPayments = sale.payments
        .filter((p) => p.method === "CASH")
        .reduce(
          (s, p) => s.plus(new Decimal(p.amount.toString())),
          new Decimal(0),
        );
      return sum.plus(cashPayments);
    }, new Decimal(0));

    // ✅ FIX (ADR-084 / Bab 18): Only CASH refunds reduce expectedCash
    const refundsInShift = await prisma.returnOrder.findMany({
      where: {
        tenantId: shift.tenantId,
        outletId: shift.outletId,
        cashierId: shift.cashierId,
        createdAt: {
          gte: shift.startTime,
          lte: now,
        },
        status: "COMPLETED",
        refundMethod: "CASH",
      },
      select: { totalRefund: true },
    });

    const refundCash = refundsInShift.reduce(
      (sum, r) => sum.plus(new Decimal(r.totalRefund.toString())),
      new Decimal(0),
    );

    expectedCash = expectedCash.minus(refundCash);
    const variance = actualCash.minus(expectedCash);

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        endTime: now,
        status: "closed",
        expectedCash: expectedCash.toNumber(),
        actualCash: actualCash.toNumber(),
        variance: variance.toNumber(),
      },
    });

    if (variance.abs().greaterThan(10000)) {
      await prisma.auditLog.create({
        data: {
          tenantId: shift.tenantId,
          userId: shift.cashierId,
          action: "SHIFT_VARIANCE",
          severity: "warning",
          metadata: JSON.stringify({
            variance: variance.toNumber(),
            expectedCash: expectedCash.toNumber(),
            actualCash: actualCash.toNumber(),
            refundCash: refundCash.toNumber(),
          }),
        },
      });
    }

    // Double-entry journal for cash over/short (§8.10)
    if (!variance.isZero()) {
      const year = new Date().getFullYear().toString();
      const [journalSeq] = await reserveNumbers(
        prisma,
        shift.tenantId,
        "JRN",
        1,
      );
      const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

      const getOrCreateAccount = async (
        code: string,
        name: string,
        type: string,
        normalBalance: string,
      ) => {
        let acc = await prisma.account.findUnique({
          where: { tenantId_code: { tenantId: shift.tenantId, code } },
        });
        if (!acc) {
          acc = await prisma.account.create({
            data: {
              tenantId: shift.tenantId,
              code,
              name,
              type,
              normalBalance,
            },
          });
        }
        return acc;
      };

      const cashAccount = await getOrCreateAccount("KAS", "Kas di Tangan", "ASSET", "DEBIT");
      const varAbs = variance.abs().toNumber();
      let lines: { accountId: string; debit: number; credit: number }[] = [];

      if (variance.isNegative()) {
        // Cash Deficit: Debit Beban Selisih Kas, Credit Kas
        const expenseAcc = await getOrCreateAccount(
          "SELISIH_KAS_BEBAN",
          "Beban Selisih Kurang Kas",
          "EXPENSE",
          "DEBIT",
        );
        lines = [
          { accountId: expenseAcc.id, debit: varAbs, credit: 0 },
          { accountId: cashAccount.id, debit: 0, credit: varAbs },
        ];
      } else {
        // Cash Surplus: Debit Kas, Credit Pendapatan Selisih Kas
        const revenueAcc = await getOrCreateAccount(
          "SELISIH_KAS_PENDAPATAN",
          "Pendapatan Selisih Lebih Kas",
          "REVENUE",
          "CREDIT",
        );
        lines = [
          { accountId: cashAccount.id, debit: varAbs, credit: 0 },
          { accountId: revenueAcc.id, debit: 0, credit: varAbs },
        ];
      }

      await prisma.journalEntry.create({
        data: {
          tenantId: shift.tenantId,
          entryNumber: journalNumber,
          entryDate: now,
          referenceType: "SHIFT_CLOSING",
          referenceId: shift.id,
          description: `Penyesuaian Selisih Kas Tutup Shift (${shift.id})`,
          status: "POSTED",
          lines: {
            create: lines,
          },
        },
      });
    }

    return updated;
  }

  async getCurrentShift(cashierId: string) {
    return prisma.shift.findFirst({
      where: {
        cashierId,
        status: "open",
      },
      include: {
        outlet: { select: { id: true, name: true } },
      },
    });
  }

  async recordAttendance(userId: string, outletId: string) {
    const user = await prisma.userProfile.findFirst({
      where: { userId },
      select: { tenantId: true },
    });

    if (!user || !user.tenantId)
      throw new LedgerError("VAL-002", "User not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendanceLog.findFirst({
      where: {
        userId,
        date: { gte: today },
        checkOut: null,
      },
    });

    if (existing) {
      const checkOut = new Date();
      const totalHours = new Decimal(
        checkOut.getTime() - existing.checkIn.getTime(),
      ).dividedBy(1000 * 60 * 60);

      return prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkOut,
          totalHours: totalHours.toNumber(),
        },
      });
    }

    return prisma.attendanceLog.create({
      data: {
        userId,
        tenantId: user.tenantId,
        outletId,
        checkIn: new Date(),
      },
    });
  }
}
