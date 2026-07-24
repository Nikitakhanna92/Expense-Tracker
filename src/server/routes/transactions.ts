import { Router } from "express";
import type { Prisma, PrismaClient } from "../../generated/prisma/index.js";
import { ApiError, isApiError } from "../errors.js";
import {
  createTransactionAndRecompute,
  deleteTransactionAndRecompute,
  updateTransactionAndRecompute,
} from "../services/budget.js";
import { getDefaultUserId } from "../services/users.js";
import {
  validateTransactionCreate,
  validateTransactionUpdate,
} from "../validation/transaction.js";

function sendError(res: import("express").Response, err: unknown) {
  if (isApiError(err)) {
    res.status(err.status).json(err.toJSON());
    return;
  }
  if (err instanceof Error && err.message.startsWith("Transaction not found")) {
    res.status(404).json({ error: err.message, field: "id" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

export function createTransactionsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const where: Prisma.TransactionWhereInput = {};

      const categoryId =
        typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";
      if (categoryId) {
        where.categoryId = categoryId;
      }

      const keyword =
        typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
      if (keyword) {
        where.description = { contains: keyword };
      }

      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { category: true },
      });
      res.json(transactions);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
        include: { category: true },
      });
      if (!transaction) {
        throw new ApiError(404, "Transaction not found", "id");
      }
      res.json(transaction);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post("/", async (req, res) => {
    try {
      const data = await validateTransactionCreate(prisma, req.body);
      const createdBy = await getDefaultUserId(prisma);
      const result = await createTransactionAndRecompute(prisma, {
        ...data,
        createdBy,
      });
      res.status(201).json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const existing = await prisma.transaction.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new ApiError(404, "Transaction not found", "id");
      }

      const data = await validateTransactionUpdate(prisma, req.body);
      const result = await updateTransactionAndRecompute(
        prisma,
        req.params.id,
        data,
      );
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const existing = await prisma.transaction.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new ApiError(404, "Transaction not found", "id");
      }

      const result = await deleteTransactionAndRecompute(prisma, req.params.id);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
