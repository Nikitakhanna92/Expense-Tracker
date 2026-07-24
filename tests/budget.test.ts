import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBudgetTestApp } from "./helpers/budgetTestApp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "../database/test.db");
const databaseUrl = `file:${testDbPath}`;

process.env.DATABASE_URL = databaseUrl;

// Apply schema to the local test DB only (no --force-reset; tables are cleared in beforeEach).
execSync("npx prisma db push --skip-generate", {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});
const app = createBudgetTestApp(prisma);

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

function monthQuery(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

describe("budget recalculation", () => {
  let userId: string;
  let groceriesId: string;
  let diningId: string;

  const now = new Date();
  const currentY = now.getUTCFullYear();
  const currentM = now.getUTCMonth();
  const prevY = currentM === 0 ? currentY - 1 : currentY;
  const prevM = currentM === 0 ? 11 : currentM - 1;

  const currentMonthDate = utcDate(currentY, currentM, 15);
  const previousMonthDate = utcDate(prevY, prevM, 15);

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@example.com" },
    });
    userId = user.id;

    const groceries = await prisma.category.create({
      data: { name: "Groceries", monthlyBudgetLimit: 10_000 },
    });
    const dining = await prisma.category.create({
      data: { name: "Dining", monthlyBudgetLimit: 5_000 },
    });
    groceriesId = groceries.id;
    diningId = dining.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("spend exactly at limit -> not over budget", async () => {
    await request(app)
      .post("/api/transactions")
      .send({
        amount: 10_000,
        description: "At limit",
        date: currentMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const res = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);

    expect(res.body).toMatchObject({
      budgetLimit: 10_000,
      spent: 10_000,
      remaining: 0,
      overBudget: false,
    });
  });

  it("spend one unit over limit -> over budget", async () => {
    await request(app)
      .post("/api/transactions")
      .send({
        amount: 10_001,
        description: "One over",
        date: currentMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const res = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);

    expect(res.body).toMatchObject({
      budgetLimit: 10_000,
      spent: 10_001,
      remaining: -1,
      overBudget: true,
    });
  });

  it("backdated transaction into a past month recalculates that month only", async () => {
    await request(app)
      .post("/api/transactions")
      .send({
        amount: 2_000,
        description: "Current spend",
        date: currentMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const createRes = await request(app)
      .post("/api/transactions")
      .send({
        amount: 3_500,
        description: "Backdated spend",
        date: previousMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    expect(createRes.body.statuses).toHaveLength(1);
    expect(createRes.body.statuses[0]).toMatchObject({
      categoryId: groceriesId,
      month: monthQuery(previousMonthDate),
      spent: 3_500,
      overBudget: false,
    });

    const past = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(previousMonthDate) })
      .expect(200);
    expect(past.body.spent).toBe(3_500);

    const current = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);
    expect(current.body.spent).toBe(2_000);
  });

  it("editing a transaction's category recalculates BOTH old and new category", async () => {
    const createRes = await request(app)
      .post("/api/transactions")
      .send({
        amount: 4_000,
        description: "Move me",
        date: currentMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const txId = createRes.body.transaction.id;

    const updateRes = await request(app)
      .put(`/api/transactions/${txId}`)
      .send({ categoryId: diningId })
      .expect(200);

    const months = updateRes.body.statuses.map(
      (s: { categoryId: string; month: string }) =>
        `${s.categoryId}:${s.month}`,
    );
    expect(months).toContain(`${groceriesId}:${monthQuery(currentMonthDate)}`);
    expect(months).toContain(`${diningId}:${monthQuery(currentMonthDate)}`);
    expect(updateRes.body.statuses).toHaveLength(2);

    const groceries = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);
    expect(groceries.body.spent).toBe(0);

    const dining = await request(app)
      .get(`/api/categories/${diningId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);
    expect(dining.body.spent).toBe(4_000);
  });

  it("editing a transaction's date across months recalculates BOTH months", async () => {
    const createRes = await request(app)
      .post("/api/transactions")
      .send({
        amount: 2_500,
        description: "Shift month",
        date: previousMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const txId = createRes.body.transaction.id;

    const updateRes = await request(app)
      .put(`/api/transactions/${txId}`)
      .send({ date: currentMonthDate.toISOString() })
      .expect(200);

    const months = updateRes.body.statuses.map(
      (s: { month: string }) => s.month,
    );
    expect(months).toContain(monthQuery(previousMonthDate));
    expect(months).toContain(monthQuery(currentMonthDate));
    expect(updateRes.body.statuses).toHaveLength(2);

    const past = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(previousMonthDate) })
      .expect(200);
    expect(past.body.spent).toBe(0);

    const current = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);
    expect(current.body.spent).toBe(2_500);
  });

  it("deleting a transaction reduces the month's total correctly", async () => {
    await request(app)
      .post("/api/transactions")
      .send({
        amount: 3_000,
        description: "Keep",
        date: currentMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const toDelete = await request(app)
      .post("/api/transactions")
      .send({
        amount: 2_000,
        description: "Remove",
        date: currentMonthDate.toISOString(),
        categoryId: groceriesId,
        createdBy: userId,
      })
      .expect(201);

    const before = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);
    expect(before.body.spent).toBe(5_000);

    const deleteRes = await request(app)
      .delete(`/api/transactions/${toDelete.body.transaction.id}`)
      .expect(200);

    expect(deleteRes.body.statuses[0]).toMatchObject({
      categoryId: groceriesId,
      month: monthQuery(currentMonthDate),
      spent: 3_000,
      overBudget: false,
    });

    const after = await request(app)
      .get(`/api/categories/${groceriesId}/status`)
      .query({ month: monthQuery(currentMonthDate) })
      .expect(200);
    expect(after.body.spent).toBe(3_000);
  });
});
