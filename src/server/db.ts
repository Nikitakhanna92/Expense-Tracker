import { PrismaClient } from "../generated/prisma/index.js";

/**
 * Shared Prisma client. Tests override DATABASE_URL before importing modules
 * that construct this, or use createPrismaClient() with an explicit URL.
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined,
  );
}

export const prisma = createPrismaClient();
