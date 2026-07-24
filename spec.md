# Spec — Expense Tracker (Budget Envelope Edition)

Spec only. No implementation code.

**Assumptions (flagged):**
- “Month” = calendar month of the transaction `date` (YYYY-MM), interpreted in UTC unless configured otherwise.
- Over-budget is **flagged** in responses by default; requests are not rejected solely for going over budget unless a future config says so.
- Core uses a single seeded User; `createdBy` is set server-side from that user (no auth).

---

## 1. Entities and fields

### User
| Field       | Type     | Notes                                      |
|-------------|----------|--------------------------------------------|
| id          | string   | Primary key (cuid/uuid)                    |
| name        | string   | Display name for seeded user               |
| email       | string   | Unique; used for seed identity             |
| createdAt   | datetime |                                            |
| updatedAt   | datetime |                                            |

### Category
| Field              | Type     | Notes                                           |
|--------------------|----------|-------------------------------------------------|
| id                 | string   | Primary key                                     |
| name               | string   | Non-empty                                       |
| monthlyBudgetLimit | integer  | Monthly envelope in **paise** (≥ 0)             |
| createdAt          | datetime |                                                 |
| updatedAt          | datetime |                                                 |

### Transaction
| Field       | Type     | Notes                                              |
|-------------|----------|----------------------------------------------------|
| id          | string   | Primary key                                        |
| amount      | integer  | Expense in **paise**; must be **> 0**              |
| description | string   | Required, non-empty                                |
| date        | datetime | Business date of the expense (drives month bucket) |
| categoryId  | string   | FK → Category; must exist                          |
| createdBy   | string   | FK → User (seeded); set by server                  |
| createdAt   | datetime |                                                    |
| updatedAt   | datetime |                                                    |

**Validation (backend):** reject negative/zero amounts, missing description, invalid/nonexistent category, invalid date. Error shape: `{ error: string, field?: string }` with 4xx.

---

## 2. REST API

Base: `/api`. JSON request/response. Money in paise on the wire for writes; status endpoint returns paise totals (UI converts for display).

### Categories
| Method | Path                         | Purpose                                      |
|--------|------------------------------|----------------------------------------------|
| GET    | `/api/categories`            | List all categories                          |
| GET    | `/api/categories/:id`        | Get one category                             |
| POST   | `/api/categories`            | Create category                              |
| PUT    | `/api/categories/:id`        | Replace/update category (name, limit)        |
| DELETE | `/api/categories/:id`        | Delete category (reject if transactions exist, or cascade — **assume reject with 409**) |
| GET    | `/api/categories/:id/status` | Current calendar month: spend vs budget      |

**`GET /api/categories/:id/status` response (conceptual):**
- `categoryId`, `month` (`YYYY-MM`)
- `budgetLimit` (paise)
- `spent` (sum of transaction amounts in that category for the month, paise)
- `remaining` (`budgetLimit - spent`)
- `overBudget` (`spent > budgetLimit`; false when equal)

### Transactions
| Method | Path                      | Purpose                         |
|--------|---------------------------|---------------------------------|
| GET    | `/api/transactions`       | List transactions (optional filters: categoryId, month) |
| GET    | `/api/transactions/:id`   | Get one transaction             |
| POST   | `/api/transactions`       | Create transaction              |
| PUT    | `/api/transactions/:id`   | Update amount / description / date / categoryId |
| DELETE | `/api/transactions/:id`   | Delete transaction              |

Mutating transaction endpoints should include (or allow fetching) affected category status after recalc so the client can show over-budget flags without trusting client math.

---

## 3. Budget recalculation algorithm

**Goal:** For each affected (categoryId, month), recompute `spent` as the sum of all Transaction `amount`s in that category whose `date` falls in that month. Then set `overBudget = spent > monthlyBudgetLimit` (equality is **not** over budget). Never trust client totals.

**Helpers**
1. `monthKey(date)` → `YYYY-MM` from the transaction’s business `date`.
2. `recompute(categoryId, monthKey)` → sum amounts for that category+month; compare to that category’s `monthlyBudgetLimit`; return `{ spent, budgetLimit, overBudget }`.
3. Collect the set of (categoryId, monthKey) pairs that need recompute for the operation, then run `recompute` for each.

### Create
1. Validate payload; ensure category exists.
2. Persist transaction with server-set `createdBy`.
3. Affected pair: `(new.categoryId, monthKey(new.date))` — including when `date` is in the past (**backdate**).
4. Recompute that pair; return transaction + status flag(s).

### Edit (amount / date / category)
1. Load existing transaction; validate new fields.
2. Determine **before** pair: `(old.categoryId, monthKey(old.date))`.
3. Determine **after** pair: `(new.categoryId, monthKey(new.date))`.
4. Persist the update.
5. Recompute **every distinct** pair in `{ before, after }`:
   - amount-only change, same date & category → one pair
   - date change across months → old month and new month (same category)
   - category reassign, same month → both categories for that month
   - category + date change → up to two pairs (old cat/month and new cat/month)
6. Return updated transaction + status for all recomputed pairs.

### Delete
1. Load existing transaction.
2. Affected pair: `(old.categoryId, monthKey(old.date))`.
3. Delete the row.
4. Recompute that pair (spent drops); return confirmation + status.

### Backdate
Backdate is not a separate API: it is create or edit where `date` is before “today.”
1. Same as create/edit.
2. Month bucket is taken from the **provided** `date`, not `createdAt`.
3. Only that historical month (and old month if edit moved the date) is recomputed — do not adjust unrelated months.

**Invariant:** After any mutation, for every touched (category, month), `spent` equals the live sum of matching transactions, and `overBudget` is true iff `spent > limit`.
