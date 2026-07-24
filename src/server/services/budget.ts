import type { PrismaClient, Transaction } from "../../generated/prisma/index.js";

/** Status for one category in one calendar month (UTC). Money in paise. */
export type CategoryStatus = {
  limit: number;
  spent: number;
  overBudget: boolean;
};

export type CategoryMonthStatus = CategoryStatus & {
  categoryId: string;
  month: string; // YYYY-MM
};

export type CategoryMonthPair = {
  categoryId: string;
  monthDate: Date;
};

export type TransactionWriteInput = {
  amount: number;
  description: string;
  date: Date;
  categoryId: string;
  createdBy: string;
};

export type TransactionUpdateInput = {
  amount?: number;
  description?: string;
  date?: Date;
  categoryId?: string;
};

/** UTC calendar month key from a business date. */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Inclusive start / exclusive end of the UTC month containing `monthDate`. */
export function monthBounds(monthDate: Date): { start: Date; endExclusive: Date } {
  const y = monthDate.getUTCFullYear();
  const m = monthDate.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    endExclusive: new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0)),
  };
}

function pairIdentity(categoryId: string, date: Date): string {
  return `${categoryId}|${monthKey(date)}`;
}

/** Distinct (categoryId, month) pairs from a list of snapshots. */
export function uniquePairs(
  items: Array<{ categoryId: string; date: Date }>,
): CategoryMonthPair[] {
  const seen = new Map<string, CategoryMonthPair>();
  for (const item of items) {
    const id = pairIdentity(item.categoryId, item.date);
    if (!seen.has(id)) {
      seen.set(id, { categoryId: item.categoryId, monthDate: item.date });
    }
  }
  return [...seen.values()];
}

export function affectedPairsForCreate(tx: {
  categoryId: string;
  date: Date;
}): CategoryMonthPair[] {
  return uniquePairs([tx]);
}

export function affectedPairsForUpdate(
  before: { categoryId: string; date: Date },
  after: { categoryId: string; date: Date },
): CategoryMonthPair[] {
  return uniquePairs([before, after]);
}

export function affectedPairsForDelete(tx: {
  categoryId: string;
  date: Date;
}): CategoryMonthPair[] {
  return uniquePairs([tx]);
}

/**
 * Live sum of transaction amounts for a category in the UTC month of `monthDate`.
 * overBudget is true only when spent > limit (equality is within budget).
 */
export async function getCategoryStatus(
  prisma: PrismaClient,
  categoryId: string,
  monthDate: Date,
): Promise<CategoryStatus> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  const { start, endExclusive } = monthBounds(monthDate);
  const aggregate = await prisma.transaction.aggregate({
    where: {
      categoryId,
      date: { gte: start, lt: endExclusive },
    },
    _sum: { amount: true },
  });

  const spent = aggregate._sum.amount ?? 0;
  const limit = category.monthlyBudgetLimit;
  return {
    limit,
    spent,
    overBudget: spent > limit,
  };
}

/** Recompute status for every affected (categoryId, month) pair. */
export async function recomputeAffectedStatuses(
  prisma: PrismaClient,
  pairs: CategoryMonthPair[],
): Promise<CategoryMonthStatus[]> {
  const results: CategoryMonthStatus[] = [];
  for (const pair of pairs) {
    const status = await getCategoryStatus(prisma, pair.categoryId, pair.monthDate);
    results.push({
      categoryId: pair.categoryId,
      month: monthKey(pair.monthDate),
      ...status,
    });
  }
  return results;
}

/**
 * Persist a transaction, then recompute status for its (category, month).
 * Backdated `date` values bucket into that past month only.
 */
export async function createTransactionAndRecompute(
  prisma: PrismaClient,
  input: TransactionWriteInput,
): Promise<{ transaction: Transaction; statuses: CategoryMonthStatus[] }> {
  const transaction = await prisma.transaction.create({ data: input });
  const statuses = await recomputeAffectedStatuses(
    prisma,
    affectedPairsForCreate(transaction),
  );
  return { transaction, statuses };
}

/**
 * Update a transaction, then recompute every distinct before/after pair
 * (old+new category and/or old+new month as needed).
 */
export async function updateTransactionAndRecompute(
  prisma: PrismaClient,
  id: string,
  input: TransactionUpdateInput,
): Promise<{ transaction: Transaction; statuses: CategoryMonthStatus[] }> {
  const before = await prisma.transaction.findUnique({ where: { id } });
  if (!before) {
    throw new Error(`Transaction not found: ${id}`);
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: input,
  });

  const statuses = await recomputeAffectedStatuses(
    prisma,
    affectedPairsForUpdate(before, transaction),
  );
  return { transaction, statuses };
}

/**
 * Delete a transaction, then recompute its former (category, month).
 */
export async function deleteTransactionAndRecompute(
  prisma: PrismaClient,
  id: string,
): Promise<{ deleted: Transaction; statuses: CategoryMonthStatus[] }> {
  const before = await prisma.transaction.findUnique({ where: { id } });
  if (!before) {
    throw new Error(`Transaction not found: ${id}`);
  }

  const deleted = await prisma.transaction.delete({ where: { id } });
  const statuses = await recomputeAffectedStatuses(
    prisma,
    affectedPairsForDelete(deleted),
  );
  return { deleted, statuses };
}
