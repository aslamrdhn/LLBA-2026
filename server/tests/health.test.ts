import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import supertest from "supertest";
import { createApp } from "../../server.ts";
import { prisma } from "../lib/prisma.ts";

describe("Health Check API", () => {
  let app: any;

  before(async () => {
    app = await createApp();
    await app.ready();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {}
  });

  after(async () => {
    await app.close();
  });

  it("GET /api/health should return 200 OK", async () => {
    const response = await supertest(app.server).get("/api/health");
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, "healthy");
    assert.ok(response.body.database);
  });
});

