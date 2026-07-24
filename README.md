# Expense Tracker

Budget envelope expense tracker. Backend is the source of truth for totals and over-budget checks. Money is stored in **paise** (integers).

See also: `project-context.md`, `spec.md`, `setup-notes.md`.

## Setup

From the project root:

```bash
npm install
cp .env.example .env
```

Prisma Client is **not** committed (`src/generated/` is gitignored). After install / clone / copy:

```bash
npx prisma generate
npx prisma migrate dev   # first time / schema changes
npx prisma db seed       # sample user, categories, transactions
```

Client deps:

```bash
cd src/client && npm install && cd ../..
```

## Run locally

Use **two terminals**:

```bash
# Terminal 1 — API (port 3000)
npm run dev
```

```bash
# Terminal 2 — UI (port 5173, proxies /api/ → :3000)
cd src/client && npm run dev
```

Open **http://localhost:5173/**

Quick API check: **http://127.0.0.1:3000/api/health**

## Tests

```bash
npm test
```

## Troubleshooting

- **API 500 / blank import errors after copy:** run `npx prisma generate` again.
- **UI loads but API calls hang:** Vite or the API process may be suspended — stop them (`Ctrl+C`) and restart both `npm run dev` commands. Free port 5173 if needed: `lsof -tiTCP:5173 | xargs kill -9`.
- **Empty envelopes / no data:** run `npx prisma db seed`.
