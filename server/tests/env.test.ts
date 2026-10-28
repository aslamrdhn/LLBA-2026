import { describe, it } from "node:test";
import assert from "node:assert";
import supertest from "supertest";
import { validateEnv } from "../env.ts";
import { createApp } from "../../server.ts";

describe("Environment & Production Safety Tests", () => {
  it("fails in production when JWT_SECRET is missing", () => {
    assert.throws(
      () => {
        validateEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
          APP_ORIGIN: "https://app.ledgerline.com",
          JWT_SECRET: "",
        });
      },
      (err: Error) => {
        return err.message.includes("JWT_SECRET");
      },
    );
  });

  it("fails in production when database url is missing", () => {
    assert.throws(
      () => {
        validateEnv({
          NODE_ENV: "production",
          APP_ORIGIN: "https://app.ledgerline.com",
          JWT_SECRET: "ledgerline_super_secret_stable_key_for_test_32_chars",
          DATABASE_URL: "",
          SQLITE_URL: "",
        });
      },
      (err: Error) => {
        return err.message.includes("DATABASE_URL");
      },
    );
  });

  it("fails in production when APP_ORIGIN is missing", () => {
    assert.throws(
      () => {
        validateEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
          JWT_SECRET: "ledgerline_super_secret_stable_key_for_test_32_chars",
          APP_ORIGIN: "",
        });
      },
      (err: Error) => {
        return err.message.includes("APP_ORIGIN");
      },
    );
  });

  it("succeeds in development with valid minimal env", () => {
    const config = validateEnv({
      NODE_ENV: "development",
      PORT: "3000",
      SQLITE_URL: "file:./dev.db",
      JWT_SECRET: "ledgerline_super_secret_stable_key_for_test_32_chars",
    });
    assert.strictEqual(config.NODE_ENV, "development");
    assert.strictEqual(config.PORT, 3000);
  });

  it("GET /reports/hpp/today must return 404 Not Found (fake numbers removed)", async () => {
    const app = await createApp();
    await app.ready();
    try {
      const response = await supertest(app.server).get("/reports/hpp/today");
      assert.strictEqual(response.status, 404);
    } finally {
      await app.close();
    }
  });
});
