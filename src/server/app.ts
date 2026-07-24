import express from "express";
import type { PrismaClient } from "../generated/prisma/index.js";
import { createCategoriesRouter } from "./routes/categories.js";
import { createTransactionsRouter } from "./routes/transactions.js";

/** Build the Express app with /api CRUD routes. Injectable prisma for tests. */
export function createApp(prisma: PrismaClient) {
  const app = express();

  // Allow Vite (5173) during local FE↔BE if proxy is skipped
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/categories", createCategoriesRouter(prisma));
  app.use("/api/transactions", createTransactionsRouter(prisma));

  return app;
}
