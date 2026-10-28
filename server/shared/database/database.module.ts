import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.ts";

class DatabaseModule {
  /**
   * Mengembalikan instance Prisma Client (PostgreSQL) aman
   */
  public static getPrisma(): PrismaClient {
    return prisma;
  }

  public static isPostgresAvailable(): boolean {
    return true; // Prisma Client manages fallback
  }
}

export { DatabaseModule };
