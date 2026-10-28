const initialNodeEnv = process.env.NODE_ENV;
import dotenv from "dotenv";
dotenv.config();
if (initialNodeEnv) {
  process.env.NODE_ENV = initialNodeEnv;
}
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
import path from "path";

if (!process.env.SQLITE_URL) {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  process.env.SQLITE_URL = `file:${dbPath}`;
}

import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import { prisma } from "./server/lib/prisma.ts";
import { ssotRoutes } from "./server/routes/ssot.routes.ts";
import { kitchenRoutes } from "./server/routes/kitchen.routes.ts";
import { authRoutes } from "./server/routes/auth.routes.ts";
import { posRoutes } from "./server/routes/pos.routes.ts";
import { offlineRoutes } from "./server/routes/offline.routes.ts";
import { inventoryRoutes } from "./server/routes/inventory.routes.ts";
import { shiftRoutes } from "./server/routes/shift.routes.ts";
import { financeRoutes } from "./server/routes/finance.routes.ts";
import { syncRoutes } from "./server/routes/sync.routes.ts";
import { supplierRoutes } from "./server/routes/supplier.routes.ts";
import { publicRoutes } from "./server/routes/public.routes.ts";
import { migrationRoutes } from "./server/routes/migration.routes.ts";
import { mockRoutes } from "./server/routes/mock.routes.ts";
import { catalogRoutes } from "./server/routes/catalog.routes.ts";
import { adminRoutes } from "./server/routes/admin.routes.ts";
import { subscriptionRoutes } from "./server/routes/subscription.routes.ts";
import { startOfflineSyncWorker } from "./server/workers/offlineSyncWorker.ts";
import { startOutboxWorker } from "./server/workers/outboxWorker.ts";
import { validateEnv } from "./server/env.ts";

export async function createApp() {
  validateEnv();

  const fastify = Fastify({
    logger: true,
  });

  // Global Error Handler
  fastify.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error(error);
    reply.status(500).send({
      success: false,
      error: error.code || "INTERNAL_ERROR",
      message: error.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  });

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false,
  });

  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || "ledgerline_cookie_secret_fallback_32b!",
    parseOptions: {},
  });

  // Register SSOT Root API routes directly
  await fastify.register(ssotRoutes);
  await fastify.register(kitchenRoutes, { prefix: "/kitchen" });

  // Register existing API scope
  fastify.register(async (api) => {
    api.register(ssotRoutes);
    api.register(kitchenRoutes, { prefix: "/kitchen" });
    api.register(authRoutes, { prefix: "/auth" });
    api.register(authRoutes, { prefix: "" });
    api.register(supplierRoutes, { prefix: "/supplier" });
    api.register(supplierRoutes, { prefix: "/procurement" });
    api.register(publicRoutes, { prefix: "/orders/public" });
    api.register(publicRoutes, { prefix: "" });
    api.register(syncRoutes, { prefix: "/orders/sync" });

    // Rule 8: Dilarang rute mock di build produksi
    if (process.env.NODE_ENV !== "production") {
      api.register(mockRoutes, { prefix: "" });
    }

    api.register(posRoutes, { prefix: "/pos" });
    api.register(offlineRoutes, { prefix: "/offline" });
    api.register(inventoryRoutes, { prefix: "/inventory" });
    api.register(inventoryRoutes, { prefix: "" });
    api.register(shiftRoutes, { prefix: "/shift" });
    api.register(financeRoutes, { prefix: "/finance" });
    api.register(financeRoutes, { prefix: "" });
    api.register(migrationRoutes, { prefix: "/migration" });
    api.register(migrationRoutes, { prefix: "" });
    api.register(catalogRoutes);
    api.register(adminRoutes, { prefix: "/admin" });
    api.register(subscriptionRoutes, { prefix: "/subscriptions" });
  }, { prefix: "/api" });

  const isApiRoute = (url: string) =>
    url.startsWith("/api") ||
    url.startsWith("/auth") ||
    url.startsWith("/sales") ||
    url.startsWith("/kitchen") ||
    url.startsWith("/sse") ||
    url.startsWith("/reports") ||
    url.startsWith("/subscription") ||
    url.startsWith("/subscriptions") ||
    url.startsWith("/offline") ||
    url === "/health";

  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    fastify.addHook("onRequest", (request: FastifyRequest, reply: FastifyReply, done) => {
      if (isApiRoute(request.url)) {
        return done();
      }
      vite.middlewares(request.raw, reply.raw, done);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    await fastify.register(fastifyStatic, {
      root: distPath,
      wildcard: false,
    });

    fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
      if (request.raw.url && isApiRoute(request.raw.url)) {
        reply.code(404).send({ error: "NOT_FOUND", message: `Route ${request.method}:${request.raw.url} not found` });
      } else {
        reply.sendFile("index.html");
      }
    });
  }

  return fastify;
}

async function startServer() {
  const PORT = 3000;
  const app = await createApp();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`[SERVER RUNNING] Access locally on http://localhost:${PORT}`);

    try {
      await prisma.$queryRaw`SELECT 1`;
      startOfflineSyncWorker().catch((err) => console.error("Error starting offline worker:", err));
      startOutboxWorker().catch((err) => console.error("Error starting outbox worker:", err));
    } catch (err: any) {
      console.warn("⚠️ Background workers not started because database connection check failed:", err.message);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const handleShutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch(console.error);
}
