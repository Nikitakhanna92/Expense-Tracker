import type { PrismaClient } from "../../generated/prisma/index.js";
import { ApiError } from "../errors.js";

export type ValidatedTransactionCreate = {
  amount: number;
  description: string;
  date: Date;
  categoryId: string;
};

export type ValidatedTransactionUpdate = {
  amount?: number;
  description?: string;
  date?: Date;
  categoryId?: string;
};

function requirePositiveAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ApiError(
      400,
      "Amount must be an integer greater than 0 (paise)",
      "amount",
    );
  }
  return value;
}

function requireDescription(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, "Description is required", "description");
  }
  return value.trim();
}

/**
 * Accept ISO-8601 / Date-parseable strings. Reject empty, non-strings, and Invalid Date.
 */
export function parseDateField(value: unknown): Date {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, "Date is required and must be a valid ISO date string", "date");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Date must be a valid ISO date string", "date");
  }
  return parsed;
}

export async function assertCategoryExists(
  prisma: PrismaClient,
  categoryId: unknown,
): Promise<string> {
  if (typeof categoryId !== "string" || categoryId.trim() === "") {
    throw new ApiError(400, "Category id is required", "categoryId");
  }
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    throw new ApiError(400, "Category does not exist", "categoryId");
  }
  return categoryId;
}

export async function validateTransactionCreate(
  prisma: PrismaClient,
  body: unknown,
): Promise<ValidatedTransactionCreate> {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body must be a JSON object");
  }
  const data = body as Record<string, unknown>;
  const categoryId = await assertCategoryExists(prisma, data.categoryId);
  return {
    amount: requirePositiveAmount(data.amount),
    description: requireDescription(data.description),
    date: parseDateField(data.date),
    categoryId,
  };
}

export async function validateTransactionUpdate(
  prisma: PrismaClient,
  body: unknown,
): Promise<ValidatedTransactionUpdate> {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body must be a JSON object");
  }
  const data = body as Record<string, unknown>;
  const update: ValidatedTransactionUpdate = {};

  if (data.amount !== undefined) {
    update.amount = requirePositiveAmount(data.amount);
  }
  if (data.description !== undefined) {
    update.description = requireDescription(data.description);
  }
  if (data.date !== undefined) {
    update.date = parseDateField(data.date);
  }
  if (data.categoryId !== undefined) {
    update.categoryId = await assertCategoryExists(prisma, data.categoryId);
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "Provide at least one field to update");
  }

  return update;
}
