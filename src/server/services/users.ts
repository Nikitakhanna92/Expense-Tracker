import type { PrismaClient } from "../../generated/prisma/index.js";
import { ApiError } from "../errors.js";

/** Core has no auth — attach transactions to the seeded (or first) user. */
export async function getDefaultUserId(prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new ApiError(
      500,
      "No user found. Run the database seed before creating transactions.",
    );
  }
  return user.id;
}
