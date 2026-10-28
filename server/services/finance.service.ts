import { prisma } from "../lib/prisma.ts";
import { Decimal } from "../utils/money.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { getBusinessDate } from "../utils/timezone.ts";

export class TrueHppService {
  async getDashboardPerformance(tenantId: string, date: Date) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });

    if (!tenant) throw new LedgerError("VAL-002", "Tenant not found");

    const businessDate = getBusinessDate(
      tenant.timezone || "Asia/Jakarta",
      date,
    );
    const startOfDay = new Date(businessDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const historicalStats = await prisma.dailyMenuStat.findMany({
      where: {
        tenantId,
        date: { lt: startOfDay },
      },
      include: { menu: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 30,
    });

    const todaySales = await prisma.salesDetail.findMany({
      where: {
        sales: {
          tenantId,
          businessDate: { gte: startOfDay, lte: endOfDay },
          status: { in: ["POSTED", "LATE_ENTRY"] },
        },
      },
      include: {
        menu: { select: { name: true } },
        sales: true,
      },
    });

    const todayMap = new Map<
      string,
      {
        menuId: string;
        menuName: string;
        revenue: number;
        qty: number;
        directHpp: number;
        allocatedCost: number;
        trueHpp?: number;
        margin?: number;
      }
    >();

    for (const detail of todaySales) {
      const key = detail.menuId;
      if (!todayMap.has(key)) {
        todayMap.set(key, {
          menuId: detail.menuId,
          menuName: detail.menu?.name || detail.menuNameSnapshot,
          revenue: 0,
          qty: 0,
          directHpp: 0,
          allocatedCost: 0,
        });
      }
      const entry = todayMap.get(key)!;
      entry.revenue += Number(detail.totalPrice);
      entry.qty += detail.quantity;
      entry.directHpp += Number(detail.hpp || 0);
    }

    const config = await prisma.costAllocationConfig.findUnique({
      where: { tenantId },
    });
    const dailyOpex = config
      ? new Decimal(config.monthlyOperationalExpense.toString())
          .plus(config.monthlyLaborExpense.toString())
          .dividedBy(30)
      : new Decimal(0);

    const totalTodayRevenue = Array.from(todayMap.values()).reduce(
      (sum, e) => sum + e.revenue,
      0,
    );

    for (const entry of todayMap.values()) {
      const share =
        totalTodayRevenue > 0 ? entry.revenue / totalTodayRevenue : 0;
      entry.allocatedCost = dailyOpex.times(share).toNumber();
      entry.trueHpp = entry.directHpp + entry.allocatedCost;
      entry.margin =
        entry.revenue > 0
          ? ((entry.revenue - entry.trueHpp) / entry.revenue) * 100
          : 0;
    }

    const todayArray = Array.from(todayMap.values());
    const yesterdayDate = new Date(startOfDay);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const yesterdayStats = await prisma.dailyMenuStat.findMany({
      where: {
        tenantId,
        date: { gte: yesterdayDate, lt: startOfDay },
      },
      include: { menu: { select: { name: true } } },
    });

    const yesterdayMap = new Map<
      string,
      { revenue: number; qty: number; margin: number }
    >();
    for (const stat of yesterdayStats) {
      yesterdayMap.set(stat.menuId, {
        revenue: Number(stat.totalRevenue),
        qty: stat.totalQty,
        margin: Number(stat.margin),
      });
    }

    const result = todayArray.map((item) => {
      const yest = yesterdayMap.get(item.menuId);
      return {
        ...item,
        yesterdayRevenue: yest?.revenue || 0,
        revenueChange:
          yest && yest.revenue > 0
            ? ((item.revenue - yest.revenue) / yest.revenue) * 100
            : 0,
        yesterdayMargin: yest?.margin || 0,
        marginChange: yest ? (item.margin || 0) - yest.margin : 0,
      };
    });

    return {
      today: result,
      historical: historicalStats,
    };
  }

  async getProfitAndLoss(tenantId: string, startDate: Date, endDate: Date) {
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        tenantId,
        entryDate: { gte: startDate, lte: endDate },
        status: "POSTED",
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
    });

    let totalRevenue = new Decimal(0);
    let totalHpp = new Decimal(0);
    let totalExpense = new Decimal(0);

    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const type = line.account.type;
        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());

        const codeUpper = (line.account.code || "").toUpperCase();
        const nameLower = (line.account.name || "").toLowerCase();
        const isHpp =
          codeUpper === "HPP" ||
          codeUpper === "5000" ||
          codeUpper.startsWith("5-") ||
          codeUpper.startsWith("50") ||
          nameLower.includes("pokok penjualan") ||
          nameLower.includes("hpp") ||
          nameLower.includes("harga pokok");

        if (type === "REVENUE") {
          // Normal credit: revenue is credit - debit
          totalRevenue = totalRevenue.plus(credit).minus(debit);
        } else if (isHpp) {
          totalHpp = totalHpp.plus(debit).minus(credit);
        } else if (type === "EXPENSE") {
          totalExpense = totalExpense.plus(debit).minus(credit);
        }
      }
    }

    const grossProfit = totalRevenue.minus(totalHpp);
    const netProfit = grossProfit.minus(totalExpense);

    return {
      period: { startDate, endDate },
      totalRevenue: totalRevenue.toNumber(),
      totalHpp: totalHpp.toNumber(),
      grossProfit: grossProfit.toNumber(),
      totalExpense: totalExpense.toNumber(),
      netProfit: netProfit.toNumber(),
      grossMarginPct: totalRevenue.greaterThan(0)
        ? grossProfit.dividedBy(totalRevenue).times(100).toNumber()
        : 0,
      netMarginPct: totalRevenue.greaterThan(0)
        ? netProfit.dividedBy(totalRevenue).times(100).toNumber()
        : 0,
    };
  }
}
