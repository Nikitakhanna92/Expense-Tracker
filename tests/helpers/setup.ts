import { beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "../../database/test.db");

// Must run before PrismaClient is constructed in tests.
process.env.DATABASE_URL = `file:${testDbPath}`;

beforeAll(() => {
  process.env.DATABASE_URL = `file:${testDbPath}`;
});
