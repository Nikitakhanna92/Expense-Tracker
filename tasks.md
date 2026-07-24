# Implementation tasks

Ordered, commit-sized work derived from `spec.md` / `data-model.md`.  
Each item = one focused commit. Do groups in order; within a group, do tasks top to bottom.

---

## (1) DB schema + migration + seed data

- [ ] **1.1** Scaffold backend package (`src/server`): Node/Express entry, `package.json`, Prisma + SQLite deps
- [ ] **1.2** Add Prisma schema for `User`, `Category`, `Transaction` (paise ints, FKs, indexes per `data-model.md`)
- [ ] **1.3** Run initial migration; commit `schema.prisma` + migration SQL
- [ ] **1.4** Add seed script: one User + a few Categories (with limits) + sample Transactions spanning current/prior months
- [ ] **1.5** Wire `prisma migrate` / `db seed` npm scripts; verify seed loads cleanly

---

## (2) Backend CRUD endpoints + validation

- [ ] **2.1** Shared error helper: 4xx `{ error, field? }` shape; mount `/api` router
- [ ] **2.2** Category validation (non-empty name, `monthlyBudgetLimit` integer ≥ 0)
- [ ] **2.3** `GET/POST /api/categories` (list + create)
- [ ] **2.4** `GET/PUT /api/categories/:id` (get one + update name/limit)
- [ ] **2.5** `DELETE /api/categories/:id` → 409 if any transactions exist
- [ ] **2.6** Transaction validation (amount > 0, non-empty description, valid date, existing categoryId)
- [ ] **2.7** `GET /api/transactions` + `GET /api/transactions/:id` (list/get; no filters yet)
- [ ] **2.8** `POST /api/transactions` (persist; set `createdBy` from seeded user)
- [ ] **2.9** `PUT /api/transactions/:id` (amount / description / date / categoryId)
- [ ] **2.10** `DELETE /api/transactions/:id`
- [ ] **2.11** Supertest smoke tests for category + transaction CRUD and validation failures

---

## (3) Budget recalculation service + tests

- [ ] **3.1** `monthKey(date)` helper (UTC `YYYY-MM`) + unit tests
- [ ] **3.2** `recompute(categoryId, monthKey)` — sum spend, compare to limit (`>` only); unit tests including spend == limit
- [ ] **3.3** Collect affected `(categoryId, month)` pairs for create / edit / delete
- [ ] **3.4** Integrate recalc into transaction create (incl. backdated `date`); return status alongside transaction
- [ ] **3.5** Integrate recalc into transaction update (amount-only, date change, category reassign, combined)
- [ ] **3.6** Integrate recalc into transaction delete
- [ ] **3.7** `GET /api/categories/:id/status` — current month spend vs budget
- [ ] **3.8** Integration tests: backdate, reassign (both categories), cross-month edit, delete, equality boundary

---

## (4) Frontend components

- [ ] **4.1** Scaffold client (`src/client`): Vite + React + styled-components; proxy/API base URL
- [ ] **4.2** API client helpers (categories, transactions, status); paise ↔ display conversion utils
- [ ] **4.3** Category list + create/edit form (name, monthly limit in rupees display)
- [ ] **4.4** Category status badge/panel (`spent` / `budgetLimit` / `overBudget` from server)
- [ ] **4.5** Transaction list (description, amount, date, category)
- [ ] **4.6** Transaction create/edit form (amount, description, date, category select)
- [ ] **4.7** Delete confirmations for category (handle 409) and transaction; refresh status after mutations
- [ ] **4.8** App shell: layout wiring list + forms; show over-budget flags from API responses

---

## (5) Search / filter

- [ ] **5.1** Backend: `GET /api/transactions?categoryId=&month=` (`month` = `YYYY-MM`)
- [ ] **5.2** Backend tests for filter combinations (none / category / month / both)
- [ ] **5.3** Frontend filter controls (category dropdown + month picker) wired to list API
- [ ] **5.4** Empty-state + clear-filters UX when no matches

---

## (6) README + setup docs

- [ ] **6.1** README: project purpose, stack, link to `spec.md` / `project-context.md`
- [ ] **6.2** Setup: install, migrate, seed, run server + client (exact commands)
- [ ] **6.3** API overview table (methods/paths) + note on paise and over-budget flagging
- [ ] **6.4** Test instructions (`vitest`/Jest + Supertest) and brief budget-recalc edge-case summary
