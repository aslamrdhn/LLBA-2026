import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import {
  authenticateToken,
  enforceTenantBoundary,
} from "../middlewares/auth.ts";
import { TrueHppService } from "../services/finance.service.ts";
import { dailyClosing } from "../workers/dailyClosingWorker.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { exportToGoogleSheets } from "../lib/gdrive.ts";
import { prisma } from "../lib/prisma.ts";
import {
  compileTrueCost,
  CostPoolInput,
  ProductVolumeInput,
} from "../domain/truecost/capacity-absorption.ts";
import { guard } from "../shared/middleware/guard.middleware.ts";
import { Decimal } from "../utils/money.ts";
import { TotpService } from "../services/totp.service.ts";
import { AuditService } from "../services/audit.service.ts";
import { BackupService } from "../services/backup.service.ts";

const financeService = new TrueHppService();

export const financeRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", enforceTenantBoundary);

  // POST /api/finance/export-drive
  fastify.post(
    "/export-drive",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { accessToken, rows, reportName } = request.body as any;
        if (!accessToken || !rows) {
          return reply
            .code(400)
            .send({ success: false, message: "Missing accessToken or rows" });
        }

        const result = await exportToGoogleSheets(
          accessToken,
          reportName || "Laporan Keuangan",
          rows,
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          message: error.message,
        });
      }
    },
  );

  // POST /api/finance/log
  fastify.post("/log", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ success: true, message: "Log saved (mock)" });
  });

  // POST /api/backup/restore
  fastify.post(
    "/backup/restore",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .code(200)
        .send({ success: true, message: "Backup restored (mock)" });
    },
  );

  // GET /api/finance/true-hpp
  fastify.get("/true-hpp", async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId!;
      const dateStr = (request.query as any)?.date;
      const date = dateStr ? new Date(dateStr) : new Date();

      const result = await financeService.getDashboardPerformance(
        tenantId,
        date,
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // GET /api/finance/true-cost (§7, §8.13 Closed Capacity Absorption & True Cost)
  fastify.get("/true-cost", async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId!;

      // 1. Fetch active menus for tenant
      const menus = await prisma.menu.findMany({
        where: { tenantId, isActive: true },
        include: {
          recipes: {
            where: { tenantId },
            orderBy: { version: "desc" },
            take: 1,
            include: {
              details: {
                include: { item: true },
              },
            },
          },
        },
      });

      // 2. Fetch sales details for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const salesHeaders = await prisma.salesHeader.findMany({
        where: {
          tenantId,
          status: { in: ["POSTED", "LATE_ENTRY"] },
          businessDate: { gte: startOfMonth },
        },
        select: {
          details: {
            select: {
              menuId: true,
              quantity: true,
              hpp: true,
              unitPriceSnapshot: true,
            },
          },
        },
      });

      // Aggregate volume and HPP per menu
      const volumeMap = new Map<string, { unitsSold: number; totalHpp: number }>();
      for (const sh of salesHeaders) {
        for (const sd of sh.details) {
          const prev = volumeMap.get(sd.menuId) || { unitsSold: 0, totalHpp: 0 };
          const qty = Number(sd.quantity) || 0;
          const lineHpp = Number(sd.hpp) || 0;
          volumeMap.set(sd.menuId, {
            unitsSold: prev.unitsSold + qty,
            totalHpp: prev.totalHpp + lineHpp,
          });
        }
      }

      // 3. Prepare product inputs
      const products: ProductVolumeInput[] = menus.map((m) => {
        const stats = volumeMap.get(m.id) || { unitsSold: 0, totalHpp: 0 };
        let hppPerUnit = 0;
        const activeRecipe = m.recipes?.[0];
        if (stats.unitsSold > 0) {
          hppPerUnit = stats.totalHpp / stats.unitsSold;
        } else if (activeRecipe?.details) {
          hppPerUnit = activeRecipe.details.reduce((acc: number, rd: any) => {
            const itemCost = Number(rd.item?.price) || 0;
            const itemQty = Number(rd.quantity) || 0;
            return acc + itemCost * itemQty;
          }, 0);
        }

        return {
          menuId: m.id,
          name: m.name,
          unitsSold: stats.unitsSold,
          hppPerUnit: Math.round(hppPerUnit),
          sellingPrice: Number(m.price) || 0,
          allocationWeight: 1,
        };
      });

      // 4. Dynamic Cost Pools backed by CostAllocationConfig (§7.6 Fixture A5)
      const costConfig = await prisma.costAllocationConfig.findUnique({
        where: { tenantId },
      });

      const laborAmount = costConfig?.monthlyLaborExpense || 12000000;
      const opAmount = costConfig?.monthlyOperationalExpense || 9000000;
      const rentAmount = Math.round(opAmount * 0.6);
      const utilAmount = Math.round(opAmount * 0.2);
      const otherAmount = Math.max(0, opAmount - rentAmount - utilAmount);
      const capacityUnits = 3000;

      const pools: CostPoolInput[] = [
        { id: "pool-labor", name: "Tenaga Kerja / Barista", category: "LABOR", expectedMonthlyAmount: laborAmount, normalCapacityUnits: capacityUnits },
        { id: "pool-rent", name: "Sewa Tempat / Bangunan", category: "RENT", expectedMonthlyAmount: rentAmount, normalCapacityUnits: capacityUnits },
        { id: "pool-utilities", name: "Listrik, Air & Gas", category: "UTILITIES", expectedMonthlyAmount: utilAmount, normalCapacityUnits: capacityUnits },
        { id: "pool-other", name: "Depresiasi & Pemeliharaan", category: "DEPRECIATION", expectedMonthlyAmount: otherAmount, normalCapacityUnits: capacityUnits },
      ];

      const result = compileTrueCost(pools, products);

      return reply.code(200).send({
        success: true,
        data: {
          periodDaysElapsed: new Date().getDate(),
          totalDaysInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
          status: "PROVISIONAL",
          confidence: result.confidence,
          isSpikeDetected: result.isSpikeDetected,
          totalPoolExpenses: result.totalPoolExpenses.toNumber(),
          totalAllocatedOverhead: result.totalAllocatedOverhead.toNumber(),
          totalIdleCost: result.totalIdleCost.toNumber(),
          pools: pools.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            amount: Number(p.expectedMonthlyAmount),
            capacity: Number(p.normalCapacityUnits),
          })),
          products: result.products.map((p) => ({
            menuId: p.menuId,
            name: p.name,
            unitsSold: p.unitsSold.toNumber(),
            hppPerUnit: p.hppPerUnit.toNumber(),
            allocatedOverheadPerUnit: p.allocatedOverheadPerUnit.toNumber(),
            trueCostPerUnit: p.trueCostPerUnit.toNumber(),
            sellingPrice: p.sellingPrice.toNumber(),
            trueMarginAmount: p.trueMarginAmount.toNumber(),
            trueMarginPercent: p.trueMarginPercent.toNumber(),
          })),
        },
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message || "Internal error compiling True Cost",
      });
    }
  });

  /**
   * GET /api/finance/bcg-matrix (§8.18)
   * 4-Quadrant Menu Engineering Matrix based on True Margin & Volume.
   * Guarded: Kasir dilarang melihat data margin.
   */
  fastify.get(
    "/bcg-matrix",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId =
          (request as any).sessionContext?.tenantId ||
          request.user?.tenantId;

        if (!tenantId) {
          return reply.code(400).send({
            success: false,
            error: "VAL-001",
            message: "Tenant ID tidak ditemukan",
          });
        }


        const menus = await prisma.menu.findMany({
          where: { tenantId },
          include: {
            recipes: {
              include: { details: { include: { item: true } } },
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sales = await prisma.salesHeader.findMany({
          where: {
            tenantId,
            status: { in: ["POSTED", "LATE_ENTRY"] },
            createdAt: { gte: thirtyDaysAgo },
          },
          select: {
            details: {
              select: { menuId: true, quantity: true },
            },
          },
        });

        const volumeMap = new Map<string, number>();
        for (const s of sales) {
          for (const d of s.details) {
            volumeMap.set(d.menuId, (volumeMap.get(d.menuId) || 0) + d.quantity);
          }
        }

        const productInputs: ProductVolumeInput[] = [];
        for (const m of menus) {
          const recipe = m.recipes?.[0];
          let hppUnit = new Decimal(0);
          if (recipe) {
            for (const d of recipe.details) {
              const itemCost = new Decimal(d.item.price || 0);
              hppUnit = hppUnit.plus(new Decimal(d.quantity).times(itemCost));
            }
          }

          productInputs.push({
            menuId: m.id,
            name: m.name,
            unitsSold: new Decimal(volumeMap.get(m.id) || 1),
            hppPerUnit: hppUnit,
            sellingPrice: new Decimal(m.price || 0),
          });
        }

        const config = await prisma.costAllocationConfig.findUnique({ where: { tenantId } });
        const poolInputs: CostPoolInput[] = [
          {
            id: "pool-labor",
            name: "Tenaga Kerja / Barista",
            category: "LABOR",
            expectedMonthlyAmount: new Decimal(config?.monthlyLaborExpense || 10000000),
            normalCapacityUnits: new Decimal(2500),
          },
          {
            id: "pool-rent",
            name: "Sewa Tempat / Bangunan",
            category: "RENT",
            expectedMonthlyAmount: new Decimal(config?.monthlyOperationalExpense ? config.monthlyOperationalExpense * 0.6 : 5000000),
            normalCapacityUnits: new Decimal(2500),
          },
          {
            id: "pool-utilities",
            name: "Listrik, Air & Gas",
            category: "UTILITIES",
            expectedMonthlyAmount: new Decimal(config?.monthlyOperationalExpense ? config.monthlyOperationalExpense * 0.4 : 2000000),
            normalCapacityUnits: new Decimal(2500),
          },
        ];

        const compiled = compileTrueCost(poolInputs, productInputs);

        // Compute threshold averages
        const validProducts = compiled.products.filter((p) => p.unitsSold.gt(0));
        const totalUnits = validProducts.reduce((s, p) => s.plus(p.unitsSold), new Decimal(0));
        const totalMarginSum = validProducts.reduce((s, p) => s.plus(p.trueMarginPercent), new Decimal(0));
        const count = validProducts.length || 1;

        const avgVolume = totalUnits.dividedBy(count);
        const avgMargin = totalMarginSum.dividedBy(count);

        const matrix = compiled.products.map((p) => {
          const isHighVolume = p.unitsSold.gte(avgVolume);
          const isHighMargin = p.trueMarginPercent.gte(avgMargin);

          let quadrant: "STAR" | "CASH_COW" | "QUESTION_MARK" | "DOG";
          let recommendation: string;

          if (isHighVolume && isHighMargin) {
            quadrant = "STAR";
            recommendation = "Pertahankan kualitas rasa, jadikan display unggulan, dan pertahankan posisi promosi.";
          } else if (isHighVolume && !isHighMargin) {
            quadrant = "CASH_COW";
            recommendation = "Menu volume tinggi namun margin tipis. Lakukan renegosiasi bahan baku atau naikkan harga bertahap 5-10%.";
          } else if (!isHighVolume && isHighMargin) {
            quadrant = "QUESTION_MARK";
            recommendation = "Margin sangat menguntungkan namun volume penjualan masih rendah. Barista wajib tawarkan upselling atau paket bundling.";
          } else {
            quadrant = "DOG";
            recommendation = "Volume rendah dan margin tipis. Pertimbangkan reformulasi resep, substitusi bahan, atau hapus dari menu.";
          }

          return {
            menuId: p.menuId,
            name: p.name,
            unitsSold: p.unitsSold.toNumber(),
            sellingPrice: p.sellingPrice.toNumber(),
            trueCostPerUnit: p.trueCostPerUnit.toNumber(),
            trueMarginPercent: p.trueMarginPercent.toNumber(),
            quadrant,
            recommendation,
          };
        });

        return reply.code(200).send({
          success: true,
          data: {
            thresholds: {
              avgVolume: avgVolume.toDecimalPlaces(1).toNumber(),
              avgMarginPercent: avgMargin.toDecimalPlaces(1).toNumber(),
            },
            quadrants: {
              stars: matrix.filter((m) => m.quadrant === "STAR"),
              cashCows: matrix.filter((m) => m.quadrant === "CASH_COW"),
              questionMarks: matrix.filter((m) => m.quadrant === "QUESTION_MARK"),
              dogs: matrix.filter((m) => m.quadrant === "DOG"),
            },
            matrix,
          },
        });
      } catch (error: any) {
        if (error instanceof LedgerError) {
          return reply.code(error.status || 400).send({
            success: false,
            error: error.code,
            message: error.message,
          });
        }
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal menyusun BCG Menu Matrix",
        });
      }
    },
  );

  /**
   * POST /api/finance/simulate-what-if (§8.18)
   * Simulates margin & profit impact of price changes and raw material cost fluctuations.
   * Guarded: OWNER & MANAGER only.
   */
  fastify.post(
    "/simulate-what-if",
    { preHandler: [guard({ roles: ["OWNER", "MANAGER"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId =
          (request as any).sessionContext?.tenantId ||
          request.user?.tenantId;

        if (!tenantId) {
          return reply.code(400).send({
            success: false,
            error: "VAL-001",
            message: "Tenant ID tidak ditemukan",
          });
        }

        const body = request.body as {
          materialPriceAdjustments?: { itemId: string; percentChange: number }[];
          overheadAdjustments?: { poolId: string; amountChangePercent: number }[];
          sellingPriceAdjustments?: { menuId: string; newPrice: number }[];
        };

        const materialMap = new Map<string, number>();
        for (const adj of body.materialPriceAdjustments || []) {
          materialMap.set(adj.itemId, adj.percentChange);
        }

        const overheadMap = new Map<string, number>();
        for (const adj of body.overheadAdjustments || []) {
          overheadMap.set(adj.poolId, adj.amountChangePercent);
        }

        const priceMap = new Map<string, number>();
        for (const adj of body.sellingPriceAdjustments || []) {
          priceMap.set(adj.menuId, adj.newPrice);
        }


        const menus = await prisma.menu.findMany({
          where: { tenantId },
          include: {
            recipes: {
              include: { details: { include: { item: true } } },
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        });

        // 1. Build Baseline & Simulated inputs
        const baselineProducts: ProductVolumeInput[] = [];
        const simulatedProducts: ProductVolumeInput[] = [];

        for (const m of menus) {
          const recipe = m.recipes?.[0];
          let baseHpp = new Decimal(0);
          let simHpp = new Decimal(0);

          if (recipe) {
            for (const d of recipe.details) {
              const baseCost = new Decimal(d.item.price || 0);
              const changePct = materialMap.get(d.itemId) || 0;
              const multiplier = new Decimal(1).plus(new Decimal(changePct).dividedBy(100));
              const simCost = baseCost.times(multiplier);

              const qty = new Decimal(d.quantity);
              baseHpp = baseHpp.plus(qty.times(baseCost));
              simHpp = simHpp.plus(qty.times(simCost));
            }
          }

          const baseSelling = new Decimal(m.price || 0);
          const simSelling = priceMap.has(m.id) ? new Decimal(priceMap.get(m.id)!) : baseSelling;

          baselineProducts.push({
            menuId: m.id,
            name: m.name,
            unitsSold: new Decimal(100), // Standard monthly volume normalization
            hppPerUnit: baseHpp,
            sellingPrice: baseSelling,
          });

          simulatedProducts.push({
            menuId: m.id,
            name: m.name,
            unitsSold: new Decimal(100),
            hppPerUnit: simHpp,
            sellingPrice: simSelling,
          });
        }

        const config = await prisma.costAllocationConfig.findUnique({ where: { tenantId } });
        const baselinePools: CostPoolInput[] = [
          {
            id: "pool-labor",
            name: "Tenaga Kerja / Barista",
            category: "LABOR",
            expectedMonthlyAmount: new Decimal(config?.monthlyLaborExpense || 10000000),
            normalCapacityUnits: new Decimal(2500),
          },
          {
            id: "pool-rent",
            name: "Sewa Tempat / Bangunan",
            category: "RENT",
            expectedMonthlyAmount: new Decimal(config?.monthlyOperationalExpense ? config.monthlyOperationalExpense * 0.6 : 5000000),
            normalCapacityUnits: new Decimal(2500),
          },
          {
            id: "pool-utilities",
            name: "Listrik, Air & Gas",
            category: "UTILITIES",
            expectedMonthlyAmount: new Decimal(config?.monthlyOperationalExpense ? config.monthlyOperationalExpense * 0.4 : 2000000),
            normalCapacityUnits: new Decimal(2500),
          },
        ];

        const simulatedPools: CostPoolInput[] = baselinePools.map((p) => {
          const baseAmt = new Decimal(p.expectedMonthlyAmount);
          const pct = overheadMap.get(p.id) || 0;
          const simAmt = baseAmt.times(new Decimal(1).plus(new Decimal(pct).dividedBy(100)));
          return {
            id: p.id,
            name: p.name,
            category: p.category as any,
            expectedMonthlyAmount: simAmt,
            normalCapacityUnits: p.normalCapacityUnits,
          };
        });

        const baseResult = compileTrueCost(baselinePools, baselineProducts);
        const simResult = compileTrueCost(simulatedPools, simulatedProducts);

        // Compute summary totals
        let baseTotalProfit = new Decimal(0);
        let simTotalProfit = new Decimal(0);

        const comparisons = [];
        for (let i = 0; i < baseResult.products.length; i++) {
          const bp = baseResult.products[i];
          const sp = simResult.products[i];

          const baseMarginAmt = bp.trueMarginAmount.times(bp.unitsSold);
          const simMarginAmt = sp.trueMarginAmount.times(sp.unitsSold);

          baseTotalProfit = baseTotalProfit.plus(baseMarginAmt);
          simTotalProfit = simTotalProfit.plus(simMarginAmt);

          comparisons.push({
            menuId: bp.menuId,
            name: bp.name,
            baseline: {
              sellingPrice: bp.sellingPrice.toNumber(),
              trueCostPerUnit: bp.trueCostPerUnit.toNumber(),
              trueMarginPercent: bp.trueMarginPercent.toNumber(),
              marginAmount: bp.trueMarginAmount.toNumber(),
            },
            simulated: {
              sellingPrice: sp.sellingPrice.toNumber(),
              trueCostPerUnit: sp.trueCostPerUnit.toNumber(),
              trueMarginPercent: sp.trueMarginPercent.toNumber(),
              marginAmount: sp.trueMarginAmount.toNumber(),
            },
            delta: {
              costChangeAmount: sp.trueCostPerUnit.minus(bp.trueCostPerUnit).toNumber(),
              marginPercentChange: sp.trueMarginPercent.minus(bp.trueMarginPercent).toNumber(),
            },
          });
        }

        const profitDelta = simTotalProfit.minus(baseTotalProfit);

        return reply.code(200).send({
          success: true,
          data: {
            summary: {
              baselineTotalProfit: baseTotalProfit.toNumber(),
              simulatedTotalProfit: simTotalProfit.toNumber(),
              profitDeltaAmount: profitDelta.toNumber(),
              isProfitPositive: profitDelta.gte(0),
            },
            comparisons,
            aggregateComparison: {
              baselineTotalProfit: baseTotalProfit.toNumber(),
              simulatedTotalProfit: simTotalProfit.toNumber(),
              profitDeltaAmount: profitDelta.toNumber(),
            },
            simulatedProducts: comparisons.map((c) => ({
              menuId: c.menuId,
              name: c.name,
              baselineSellingPrice: c.baseline.sellingPrice,
              simulatedSellingPrice: c.simulated.sellingPrice,
              baselineTrueCost: c.baseline.trueCostPerUnit,
              simulatedTrueCost: c.simulated.trueCostPerUnit,
              marginDeltaAmount: c.simulated.marginAmount - c.baseline.marginAmount,
            })),
          },
        });
      } catch (error: any) {
        if (error instanceof LedgerError) {
          return reply.code(error.status || 400).send({
            success: false,
            error: error.code,
            message: error.message,
          });
        }
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal melakukan simulasi What-If Margin",
        });
      }
    },
  );

  // GET /api/finance/profit-loss
  fastify.get("/profit-loss", async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId!;
      const query = request.query as any;

      const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(new Date().setDate(1));
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      const result = await financeService.getProfitAndLoss(
        tenantId,
        startDate,
        endDate,
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // POST /api/finance/daily-closing
  fastify.post("/daily-closing", async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId!;

      await dailyClosing(tenantId);

      return reply.code(200).send({
        success: true,
        message: "Daily closing triggered and completed successfully",
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/finance/period-closing (§2.2, §18 A14)
   * Owner locks accounting period. Requires TOTP 2FA if enabled.
   */
  fastify.post(
    "/period-closing",
    { preHandler: [guard({ roles: ["OWNER"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).sessionContext?.tenantId || request.user?.tenantId;
        const userId = (request as any).sessionContext?.userId || request.user?.userId;
        const { periodId, totpCode, notes } = request.body as {
          periodId: string;
          totpCode?: string;
          notes?: string;
        };

        if (!periodId) {
          throw new LedgerError("VAL-001", "ID periode akuntansi diperlukan.");
        }

        const userProfileId = (request as any).sessionContext?.userId || (request as any).sessionContext?.user?.id;
        const externalUserId = request.user?.userId;

        // Verify Owner's TOTP status
        const owner = await prisma.userProfile.findFirst({
          where: {
            tenantId,
            OR: [
              ...(userProfileId ? [{ id: userProfileId }] : []),
              ...(externalUserId ? [{ userId: externalUserId }] : []),
            ],
          },
        });

        if (!owner) {
          throw new LedgerError("AUT-001", "Profil pemilik (Owner) tidak ditemukan.");
        }

        let meta: Record<string, any> = {};
        try {
          meta = owner.metadata ? JSON.parse(owner.metadata) : {};
        } catch {
          meta = {};
        }

        if (meta.totp?.enabled) {
          if (!totpCode) {
            throw new LedgerError(
              "AUT-005",
              "Aksi penutupan buku permanen memerlukan verifikasi kode TOTP (2FA).",
            );
          }
          const valid = await TotpService.verifyCode(owner.userId, totpCode);
          if (!valid.valid) {
            throw new LedgerError("AUT-005", "Kode TOTP tidak valid atau kedaluwarsa.");
          }
        }

        const period = await prisma.period.findFirst({
          where: { id: periodId, tenantId },
        });

        if (!period) {
          throw new LedgerError("VAL-001", "Periode akuntansi tidak ditemukan.");
        }

        if (period.status === "LOCKED") {
          throw new LedgerError("VAL-001", "Periode ini sudah dikunci permanen.");
        }

        const updated = await prisma.period.update({
          where: { id: period.id },
          data: {
            status: "LOCKED",
            closedAt: new Date(),
          },
        });

        await AuditService.recordAuditLog({
          tenantId,
          userId,
          actorRole: "OWNER",
          action: "closing.lock",
          resourceType: "PERIOD",
          resourceId: period.id,
          newData: { status: "LOCKED", closedAt: new Date().toISOString(), notes },
          severity: "critical",
        });

        return reply.code(200).send({
          success: true,
          message: `Periode akuntansi ${period.name} berhasil dikunci permanen.`,
          data: updated,
        });
      } catch (error: any) {
        if (error instanceof LedgerError) {
          return reply.code(error.status || 400).send({
            success: false,
            error: error.code,
            message: error.message,
          });
        }
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal melakukan penutupan periode",
        });
      }
    },
  );

  /**
   * GET /api/finance/backup/export (§18 A15)
   * Export encrypted tenant snapshot with checksum
   */
  fastify.get(
    "/backup/export",
    { preHandler: [guard({ roles: ["OWNER"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).sessionContext?.tenantId || request.user?.tenantId;
        const backup = await BackupService.createTenantBackup(tenantId);

        return reply.code(200).send({
          success: true,
          data: backup,
        });
      } catch (error: any) {
        if (error instanceof LedgerError) {
          return reply.code(error.status || 400).send({
            success: false,
            error: error.code,
            message: error.message,
          });
        }
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Gagal membuat data cadangan (backup)",
        });
      }
    },
  );

  /**
   * GET /api/finance/backup/download
   * Direct download endpoint for backup JSON
   */
  fastify.get(
    "/backup/download",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId =
          (request as any).sessionContext?.tenantId ||
          request.user?.tenantId ||
          (request.headers["x-tenant-id"] as string) ||
          (request.query as any)?.tenantId;

        if (!tenantId) {
          return reply.code(400).send({ success: false, message: "Tenant ID diperlukan" });
        }

        const backup = await BackupService.createTenantBackup(tenantId);
        const filename = `ledgerline-backup-${tenantId.slice(0, 8)}-${Date.now()}.json`;

        return reply
          .header("Content-Type", "application/json")
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .send(backup);
      } catch (err: any) {
        return reply.code(500).send({ success: false, message: err.message });
      }
    },
  );

  /**
   * POST /api/finance/backup/verify (§18 A15)
   * Verify backup integrity and double-entry invariants
   */
  fastify.post(
    "/backup/verify",
    { preHandler: [guard({ roles: ["OWNER"] })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { encryptedData, checksum } = request.body as {
          encryptedData: string;
          checksum: string;
        };

        if (!encryptedData || !checksum) {
          throw new LedgerError("VAL-001", "Data terenkripsi dan checksum diperlukan.");
        }

        const report = BackupService.verifyBackup(encryptedData, checksum);

        return reply.code(200).send({
          success: true,
          data: report,
        });
      } catch (error: any) {
        if (error instanceof LedgerError) {
          return reply.code(error.status || 400).send({
            success: false,
            error: error.code,
            message: error.message,
          });
        }
        return reply.code(500).send({
          success: false,
          error: "SYS_001",
          message: error.message || "Verifikasi data cadangan gagal",
        });
      }
    },
  );
};

