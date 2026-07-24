# Database setup notes

Local persistence uses **Prisma + SQLite**. All money fields are integers in **paise** (minor units).

## Prerequisites

From the project root:

```bash
npm install prisma @prisma/client
npm install -D tsx typescript @types/node
```

Ensure `package.json` includes the seed runner:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Copy the env example and adjust if needed:

```bash
cp .env.example .env
```

## Migrate

Creates/updates the SQLite file and applies the schema:

```bash
npx prisma migrate dev --name init
```

- Reads `DATABASE_URL` from `.env`
- Writes the DB under `database/dev.db` (see `.env.example`)
- Generates Prisma Client

Re-run with a new `--name` whenever you change `prisma/schema.prisma`.

## Seed

Loads 1 user, 4 categories, and ~10 sample transactions (current + previous month). **Dining Out** is intentionally over budget for the current month (325000 spent vs 300000 limit, paise).

```bash
npx prisma db seed
```

Safe to re-run: the seed clears existing `Transaction` / `Category` / `User` rows first.

## Quick check

```bash
npx prisma studio
```

Inspect categories and transaction amounts (paise) in the browser UI.
