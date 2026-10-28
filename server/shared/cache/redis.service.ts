import Redis from "ioredis";
import { env } from "../../env.ts";
import { logger } from "../../logger.js";

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    if (env.NODE_ENV !== "production" && !process.env.REDIS_URL) {
      logger.warn(
        "[REDIS] REDIS_URL not set, falling back to local mock in-memory for development.",
      );
      // Fallback mock untuk lingkungan yang tidak ada redis
      return new Proxy({} as any, {
        get: () => async () => null,
      });
    }

    try {
      redisClient = new Redis(
        process.env.REDIS_URL || "redis://localhost:6379",
        {
          maxRetriesPerRequest: 3,
          showFriendlyErrorStack: env.NODE_ENV === "development",
        },
      );

      redisClient.on("connect", () => {
        logger.info("[REDIS] Successfully connected to Redis Server.");
      });

      redisClient.on("error", (err) => {
        // Silently handle connection errors
      });
    } catch (error: any) {
      // Silently handle instantiate errors
      redisClient = null;
    }
  }

  return (
    redisClient ||
    (new Proxy({} as any, {
      get: () => async () => null,
    }) as unknown as Redis)
  );
};

export const clearCacheByPattern = async (pattern: string) => {
  const client = getRedisClient();
  const keys = await client.keys(pattern);
  if (keys && keys.length > 0) {
    await client.del(...keys);
    logger.info(
      `[REDIS] Cleared ${keys.length} keys matching pattern: ${pattern}`,
    );
  }
};
