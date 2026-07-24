# Data Model — Prisma schema

Spec only. Target: Prisma + SQLite. Money fields are integers in minor units (paise).

```prisma
// datasource + generator omitted here as deployment detail;
// use provider = "sqlite" per project rules.

model User {
  id           String        @id @default(cuid())
  name         String
  email        String        @unique
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  transactions Transaction[]
}

model Category {
  id                 String        @id @default(cuid())
  name               String
  monthlyBudgetLimit Int           // paise; monthly envelope
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  transactions       Transaction[]
}

model Transaction {
  id          String   @id @default(cuid())
  amount      Int      // paise; must be > 0 (enforced in service layer)
  description String
  date        DateTime // business date; drives YYYY-MM budget bucket
  categoryId  String
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category Category @relation(fields: [categoryId], references: [id])
  creator  User     @relation(fields: [createdBy], references: [id])

  @@index([categoryId, date])
  @@index([createdBy])
}
```

**Notes**
- No separate Budget/Envelope table: monthly spend is derived by summing `Transaction.amount` for `(categoryId, month)`.
- `createdBy` maps to `User.id`; Core seeds one user and sets this server-side.
- Index on `[categoryId, date]` supports status and recalculation queries.
