import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

/** Calendar helpers — UTC month boundaries for seed dates. */
function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

function monthParts(base: Date = new Date()) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  return { y, m, prevY, prevM };
}

async function main() {
  // Wipe in FK-safe order for idempotent re-seeds during local setup.
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@expense-tracker.local",
    },
  });

  // Budgets in paise (₹1 = 100 paise).
  const groceries = await prisma.category.create({
    data: { name: "Groceries", monthlyBudgetLimit: 800_000 }, // ₹8,000
  });
  const dining = await prisma.category.create({
    data: { name: "Dining Out", monthlyBudgetLimit: 300_000 }, // ₹3,000 — seeded over budget
  });
  const transport = await prisma.category.create({
    data: { name: "Transport", monthlyBudgetLimit: 500_000 }, // ₹5,000
  });
  const entertainment = await prisma.category.create({
    data: { name: "Entertainment", monthlyBudgetLimit: 400_000 }, // ₹4,000
  });

  const { y, m, prevY, prevM } = monthParts();

  // ~10 transactions across previous + current month.
  // Dining Out current month: 120k + 95k + 110k = 325_000 > 300_000 → over budget.
  const samples: Array<{
    amount: number;
    description: string;
    date: Date;
    categoryId: string;
  }> = [
    // Previous month
    {
      amount: 220_000,
      description: "Weekly groceries",
      date: utcDate(prevY, prevM, 5),
      categoryId: groceries.id,
    },
    {
      amount: 85_000,
      description: "Cafe lunch",
      date: utcDate(prevY, prevM, 12),
      categoryId: dining.id,
    },
    {
      amount: 150_000,
      description: "Metro card top-up",
      date: utcDate(prevY, prevM, 18),
      categoryId: transport.id,
    },
    {
      amount: 90_000,
      description: "Movie night",
      date: utcDate(prevY, prevM, 22),
      categoryId: entertainment.id,
    },
    // Current month
    {
      amount: 250_000,
      description: "Big basket run",
      date: utcDate(y, m, 3),
      categoryId: groceries.id,
    },
    {
      amount: 120_000,
      description: "Team dinner",
      date: utcDate(y, m, 6),
      categoryId: dining.id,
    },
    {
      amount: 95_000,
      description: "Weekend brunch",
      date: utcDate(y, m, 10),
      categoryId: dining.id,
    },
    {
      amount: 110_000,
      description: "Date-night restaurant",
      date: utcDate(y, m, 14),
      categoryId: dining.id,
    },
    {
      amount: 180_000,
      description: "Cab rides",
      date: utcDate(y, m, 8),
      categoryId: transport.id,
    },
    {
      amount: 75_000,
      description: "Concert tickets",
      date: utcDate(y, m, 16),
      categoryId: entertainment.id,
    },
  ];

  await prisma.transaction.createMany({
    data: samples.map((t) => ({
      ...t,
      createdBy: user.id,
    })),
  });

  console.log("Seed complete:");
  console.log(`  user: ${user.email}`);
  console.log(`  categories: 4 (Dining Out over budget this month at 325000/300000 paise)`);
  console.log(`  transactions: ${samples.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
