import { prisma } from "../../lib/prisma.ts";
import { FifoCostEngine } from "./FifoCostEngine.ts";
import { AverageCostEngine } from "./AverageCostEngine.ts";
import { ICostEngine } from "./ICostEngine.ts";
import NodeCache from "node-cache";

const engineCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

export class CostEngineFactory {
  static async getEngine(tenantId: string): Promise<ICostEngine> {
    const cacheKey = `engine:${tenantId}`;
    const cached = engineCache.get<ICostEngine>(cacheKey);
    if (cached) return cached;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) throw new Error("Tenant not found");

    let engine: ICostEngine;
    // According to specs, cashier/standard uses FIFO, enterprise/hybrid uses Average (or based on tenant config)
    if (tenant.plan === "cashier") {
      engine = new FifoCostEngine();
    } else {
      engine = new AverageCostEngine();
    }

    engineCache.set(cacheKey, engine);
    return engine;
  }

  static clearCache(tenantId: string): void {
    engineCache.del(`engine:${tenantId}`);
  }
}
