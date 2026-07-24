import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { createApp } from "../src/server/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "../database/test.db");
const databaseUrl = `file:${testDbPath}`;

process.env.DATABASE_URL = databaseUrl;

execSync("npx prisma db push --skip-generate", {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});
const app = createApp(prisma);

describe("API CRUD + validation + filters", () => {
  let groceriesId: string;
  let diningId: string;

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: { name: "API User", email: "api@example.com" },
    });

    const groceries = await prisma.category.create({
      data: { name: "Groceries", monthlyBudgetLimit: 50_000 },
    });
    const dining = await prisma.category.create({
      data: { name: "Dining", monthlyBudgetLimit: 20_000 },
    });
    groceriesId = groceries.id;
    diningId = dining.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects invalid transaction payloads with 4xx { error, field }", async () => {
    const zero = await request(app)
      .post("/api/transactions")
      .send({
        amount: 0,
        description: "Bad",
        date: new Date().toISOString(),
        categoryId: groceriesId,
      })
      .expect(400);
    expect(zero.body).toMatchObject({ error: expect.any(String), field: "amount" });

    const missingDesc = await request(app)
      .post("/api/transactions")
      .send({
        amount: 100,
        description: "   ",
        date: new Date().toISOString(),
        categoryId: groceriesId,
      })
      .expect(400);
    expect(missingDesc.body.field).toBe("description");

    const badDate = await request(app)
      .post("/api/transactions")
      .send({
        amount: 100,
        description: "Coffee",
        date: "not-a-date",
        categoryId: groceriesId,
      })
      .expect(400);
    expect(badDate.body.field).toBe("date");

    const badCategory = await request(app)
      .post("/api/transactions")
      .send({
        amount: 100,
        description: "Coffee",
        date: new Date().toISOString(),
        categoryId: "missing-id",
      })
      .expect(400);
    expect(badCategory.body.field).toBe("categoryId");
  });

  it("filters transactions by keyword and categoryId", async () => {
    await request(app)
      .post("/api/transactions")
      .send({
        amount: 1000,
        description: "Weekly groceries run",
        date: new Date().toISOString(),
        categoryId: groceriesId,
      })
      .expect(201);

    await request(app)
      .post("/api/transactions")
      .send({
        amount: 2000,
        description: "Team dinner",
        date: new Date().toISOString(),
        categoryId: diningId,
      })
      .expect(201);

    const byKeyword = await request(app)
      .get("/api/transactions")
      .query({ keyword: "groceries" })
      .expect(200);
    expect(byKeyword.body).toHaveLength(1);
    expect(byKeyword.body[0].description).toContain("groceries");

    const byCategory = await request(app)
      .get("/api/transactions")
      .query({ categoryId: diningId })
      .expect(200);
    expect(byCategory.body).toHaveLength(1);
    expect(byCategory.body[0].categoryId).toBe(diningId);

    const combined = await request(app)
      .get("/api/transactions")
      .query({ categoryId: groceriesId, keyword: "dinner" })
      .expect(200);
    expect(combined.body).toHaveLength(0);
  });

  it("returns 409 when deleting a category that still has transactions", async () => {
    await request(app)
      .post("/api/transactions")
      .send({
        amount: 500,
        description: "Milk",
        date: new Date().toISOString(),
        categoryId: groceriesId,
      })
      .expect(201);

    const res = await request(app)
      .delete(`/api/categories/${groceriesId}`)
      .expect(409);
    expect(res.body).toMatchObject({ error: expect.any(String), field: "id" });
  });
});
