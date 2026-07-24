import { prisma } from "./db.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp(prisma);

app.listen(port, "127.0.0.1", () => {
  console.log(`Expense tracker API listening on http://127.0.0.1:${port}`);
});
