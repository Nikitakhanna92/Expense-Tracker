import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/index.js";
import { ApiError, isApiError } from "../errors.js";
import {
  getCategoryStatus,
  monthKey,
} from "../services/budget.js";
import {
  validateCategoryCreate,
  validateCategoryUpdate,
} from "../validation/category.js";

function sendError(res: import("express").Response, err: unknown) {
  if (isApiError(err)) {
    res.status(err.status).json(err.toJSON());
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

export function createCategoriesRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
      });
      res.json(categories);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get("/:id/status", async (req, res) => {
    try {
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
      });
      if (!category) {
        throw new ApiError(404, "Category not found", "id");
      }

      const monthDate = req.query.month
        ? parseMonthQuery(String(req.query.month))
        : new Date();

      const status = await getCategoryStatus(prisma, category.id, monthDate);
      res.json({
        categoryId: category.id,
        month: monthKey(monthDate),
        budgetLimit: status.limit,
        spent: status.spent,
        remaining: status.limit - status.spent,
        overBudget: status.overBudget,
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
      });
      if (!category) {
        throw new ApiError(404, "Category not found", "id");
      }
      res.json(category);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post("/", async (req, res) => {
    try {
      const data = validateCategoryCreate(req.body);
      const category = await prisma.category.create({ data });
      res.status(201).json(category);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const existing = await prisma.category.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new ApiError(404, "Category not found", "id");
      }
      const data = validateCategoryUpdate(req.body);
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data,
      });
      res.json(category);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const existing = await prisma.category.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new ApiError(404, "Category not found", "id");
      }

      const txCount = await prisma.transaction.count({
        where: { categoryId: req.params.id },
      });
      if (txCount > 0) {
        throw new ApiError(
          409,
          "Cannot delete category while transactions still reference it",
          "id",
        );
      }

      await prisma.category.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}

function parseMonthQuery(month: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new ApiError(400, "month must be YYYY-MM", "month");
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new ApiError(400, "month must be YYYY-MM", "month");
  }
  return new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
}
