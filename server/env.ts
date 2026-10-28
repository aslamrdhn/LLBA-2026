import dotenv from "dotenv";
const initialNodeEnv = process.env.NODE_ENV;
dotenv.config();
if (initialNodeEnv) {
  process.env.NODE_ENV = initialNodeEnv;
}
import { z } from "zod";
import { logger } from "./logger.js";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.string().default("info"),
  SQLITE_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").optional(),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters").optional(),
  SECRETS_ENC_KEY: z.string().length(32, "SECRETS_ENC_KEY must be exactly 32 bytes").optional(),
  SUPERADMIN_EMAIL: z.string().email().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  WORKER_MODE: z.enum(["inline", "separate"]).default("inline"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  const source = customEnv || process.env;
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`[ENV] Environment validation failed: ${errorDetails}`);
  }

  const data = parsed.data;

  // Strict enforcement for production mode
  if (data.NODE_ENV === "production") {
    const missing: string[] = [];
    if (!data.JWT_SECRET || data.JWT_SECRET.includes("placeholder") || data.JWT_SECRET.includes("fallback")) {
      missing.push("JWT_SECRET");
    }
    if (!data.DATABASE_URL && !data.SQLITE_URL) {
      missing.push("DATABASE_URL");
    }
    if (!data.APP_ORIGIN) {
      missing.push("APP_ORIGIN");
    }

    if (missing.length > 0) {
      throw new Error(`[ENV] Production boot rejected: Required secret(s) missing or placeholder: ${missing.join(", ")}`);
    }
  }

  return data;
}

export let env: EnvConfig;

try {
  env = validateEnv();
} catch (err: any) {
  if (process.env.NODE_ENV === "test") {
    env = {
      NODE_ENV: "test",
      PORT: 3000,
      APP_ORIGIN: "http://localhost:3000",
      LOG_LEVEL: "info",
      SQLITE_URL: "file:./dev.db",
      DATABASE_URL: "file:./dev.db",
      JWT_SECRET: "ledgerline_super_secret_stable_key_for_test_32_chars",
      COOKIE_SECRET: "ledgerline_cookie_secret_stable_key_test_32_chars",
      SUPERADMIN_EMAIL: "admin@ledgerline.local",
      WORKER_MODE: "inline",
    };
  } else {
    logger.error(err.message || String(err));
    process.exit(1);
  }
}
