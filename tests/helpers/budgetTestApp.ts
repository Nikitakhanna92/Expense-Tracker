import type { PrismaClient } from "../../src/generated/prisma/index.js";
import { createApp } from "../../src/server/app.js";

/** Tests exercise the real Express app (budget service wired into routes). */
export function createBudgetTestApp(prisma: PrismaClient) {
  return createApp(prisma);
}
