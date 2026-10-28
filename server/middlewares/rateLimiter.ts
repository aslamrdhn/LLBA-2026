import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { env } from "../env.ts";
import { logger } from "../logger.js";

interface RateLimitStore {
  [ip: string]: {
    timestamps: number[];
  };
}

const stores: Record<string, RateLimitStore> = {};
let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Avoid infinite reconnect loop if redis drops
    });
    redisClient.on("error", (err) => {
      logger.warn(
        `[RATE LIMITER] Redis connection error: ${err.message}. Falling back to Memory store.`,
      );
      redisClient = null;
    });
  } catch (err: any) {
    logger.warn(
      `[RATE LIMITER] Redis setup failed: ${err.message}. Falling back to Memory store.`,
    );
  }
}

export const createRateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const limitId = Math.random().toString(36).substring(2, 9);
  stores[limitId] = {};

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "127.0.0.1";
    const now = Date.now();
    const redisKey = `ratelimit:${limitId}:${key}`;

    try {
      if (redisClient) {
        // Redis Pipeline: Cleanup old, add new, get count, set expire
        const multi = redisClient.multi();
        multi.zremrangebyscore(redisKey, 0, now - options.windowMs);
        multi.zadd(redisKey, now, `${now}-${Math.random()}`);
        multi.zcard(redisKey);
        multi.pexpire(redisKey, options.windowMs);
        const results = await multi.exec();

        if (results && results[2] && results[2][1] !== null) {
          const count = results[2][1] as number;
          if (count > options.maxRequests) {
            return res.status(429).json({
              success: false,
              message: options.message,
              retryAfterMs: options.windowMs,
            });
          }
        }
        return next();
      }
    } catch (err) {
      // Quietly swallow redis errors during execution and fallback
    }

    // Fallback: In-memory store
    if (!stores[limitId][key]) {
      stores[limitId][key] = { timestamps: [] };
    }

    stores[limitId][key].timestamps = stores[limitId][key].timestamps.filter(
      (timestamp) => now - timestamp < options.windowMs,
    );

    if (stores[limitId][key].timestamps.length >= options.maxRequests) {
      return res.status(429).json({
        success: false,
        message: options.message,
        retryAfterMs:
          options.windowMs - (now - stores[limitId][key].timestamps[0]),
      });
    }

    stores[limitId][key].timestamps.push(now);
    next();
  };
};

// Ready-to-use rate limit configurations
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts
  message:
    "Terlalu banyak percobaan masuk dari alamat IP ini. Silakan coba lagi dalam 15 menit.",
});

export const superadminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 superadmin operations
  message:
    "Batas operasional Superadmin terlampaui. Maksimal 10 perubahan per menit.",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 10 * 1000, // 10 seconds
  maxRequests: 30, // 30 standard requests
  message:
    "Tingkat permintaan terlalu cepat. Sinyal API di-limit untuk kestabilan.",
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Max 5 OTP requests per email
  message:
    "Batas pengiriman OTP harian/jam tercapai. Harap tunggu beberapa saat sebelum mencoba lagi.",
  keyGenerator: (req) =>
    req.body.email
      ? String(req.body.email).toLowerCase()
      : (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "127.0.0.1",
});
