# Project Context — Expense Tracker

## Purpose
Track personal expenses against monthly category budgets (“budget envelopes”). The backend owns all totals and over-budget checks; the client displays and submits data only.

## Entities
- **User** — seeded identity for ownership; auth is out of scope for Core.
- **Category** — named spend bucket with a monthly budget limit (paise).
- **Transaction** — expense: amount (paise), description, date, category. No other entities unless requested.

## Tech stack
- **Frontend:** React + Vite, styled-components
- **Backend:** Node.js + Express, REST `/api`, JSON
- **Data:** Prisma + SQLite; money as integers (paise)
- **Tests:** Vitest (or Jest) + Supertest

## Signature business rule
A Category has a monthly budget. On Transaction create, update, **backdate**, or **reassign**, the server recalculates rolling totals for every affected category/month and flags over-budget (do not silently block unless configured).

Must stay correct for:
- backdated spends
- moves between categories (both sides recalc)
- edits that change date (old and new months)
- boundary: spending == limit is OK; only **>** limit is over budget

Client-computed balances are never trusted — always recompute server-side.
