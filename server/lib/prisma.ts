import "../env.ts";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Ensure SQLITE_URL is set before Prisma Client initialization
if (!process.env.SQLITE_URL) {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  process.env.SQLITE_URL = `file:${dbPath}`;
}

declare global {
  var prisma: PrismaClient | undefined;
}

const activeDbUrl = process.env.DATABASE_URL || process.env.SQLITE_URL;

export const prisma =
  global.prisma ||
  new PrismaClient(
    activeDbUrl
      ? {
          datasources: {
            db: {
              url: activeDbUrl,
            },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Executes a transaction within the context of a specific tenant.
 * Uses PostgreSQL's `SET LOCAL app.tenant_id` to enforce Row-Level Security (RLS) if running on PostgreSQL.
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // Escape the tenantId to prevent SQL injection, though Prisma $executeRaw handles it if passed as parameter
      try {
        if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("postgres")) {
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        }
      } catch {
        // In SQLite or environments without PostgreSQL set_config, bypass
      }
      return callback(tx);
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );
}
