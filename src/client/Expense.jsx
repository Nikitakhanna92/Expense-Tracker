import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
  createTransaction,
  deleteTransaction,
  getCategoryStatus,
  listCategories,
  listTransactions,
  updateTransaction,
} from "./api.js";
import EnvelopeCard from "./components/EnvelopeCard.jsx";
import FilterBar from "./components/FilterBar.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import TransactionList from "./components/TransactionList.jsx";
import BudgetStatusBadge from "./components/BudgetStatusBadge.jsx";
import { COLORS } from "./theme.js";
import { currentMonthLabel, formatMoney } from "./money.js";

const Global = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root {
    margin: 0;
    min-height: 100%;
  }

  body {
    background: ${COLORS.bg};
    color: ${COLORS.textOnDark};
  }
`;

const Page = styled.div`
  background: ${COLORS.bg};
  min-height: 100%;
`;

const Inner = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 20px 60px;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 40px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

const Eyebrow = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${COLORS.gold};
  margin: 0 0 6px;
`;

const Brand = styled.h1`
  font-family: "Fraunces", serif;
  font-style: italic;
  font-weight: 600;
  font-size: 40px;
  color: ${COLORS.textOnDark};
  margin: 0;
`;

const OnHand = styled.div`
  background: ${COLORS.bgRaised};
  border: 1px solid ${COLORS.kraftDark};
  border-radius: 10px;
  padding: 12px 20px;
  min-width: 180px;
`;

const OnHandLabel = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${COLORS.textOnDarkMuted};
  margin: 0 0 4px;
`;

const OnHandValue = styled.p`
  font-family: "IBM Plex Mono", monospace;
  font-size: 26px;
  font-weight: 500;
  color: ${COLORS.textOnDark};
  margin: 0;
`;

const EnvelopeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 48px;

  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Banner = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 14px;
  color: ${(p) => (p.$error ? COLORS.red : COLORS.textOnDarkMuted)};
  margin: 0 0 16px;
`;

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

/**
 * Main expense screen — Ledger & Twine design, data from the API.
 * Budget totals come from server status endpoints (never client-summed as truth).
 */
export default function Expense() {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [lastStatuses, setLastStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshStatuses = useCallback(async (cats) => {
    const entries = await Promise.all(
      cats.map(async (c) => {
        try {
          const status = await getCategoryStatus(c.id);
          return [c.id, status];
        } catch {
          return [
            c.id,
            {
              budgetLimit: c.monthlyBudgetLimit,
              spent: 0,
              remaining: c.monthlyBudgetLimit,
              overBudget: false,
            },
          ];
        }
      }),
    );
    setStatuses(Object.fromEntries(entries));
  }, []);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [cats, txs] = await Promise.all([
        listCategories(),
        listTransactions({ keyword: keyword.trim() || undefined }),
      ]);
      setCategories(cats);
      setTransactions(txs);
      await refreshStatuses(cats);
    } catch (err) {
      setError(err.message || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [keyword, refreshStatuses]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, keyword ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, keyword]);

  const onHand = useMemo(() => {
    return categories.reduce((sum, c) => {
      const s = statuses[c.id];
      const remaining = s?.remaining ?? c.monthlyBudgetLimit - (s?.spent ?? 0);
      return sum + remaining;
    }, 0);
  }, [categories, statuses]);

  async function handleSave(payload) {
    const result = editing
      ? await updateTransaction(editing.id, payload)
      : await createTransaction(payload);

    setLastStatuses(result.statuses ?? []);
    setEditing(null);
    setFormOpen(false);
    await load();
  }

  async function handleDelete(tx) {
    if (!window.confirm(`Delete “${tx.description}”?`)) return;
    try {
      const result = await deleteTransaction(tx.id);
      setLastStatuses(result.statuses ?? []);
      if (editing?.id === tx.id) {
        setEditing(null);
        setFormOpen(false);
      }
      await load();
    } catch (err) {
      setError(err.message || "Could not delete.");
    }
  }

  function startEdit(tx) {
    setEditing(tx);
    setFormOpen(true);
  }

  return (
    <Page>
      <Global />
      <Inner>
        <Header>
          <div>
            <Eyebrow>Envelope budgeting, kept honest</Eyebrow>
            <Brand>Nikita's Expense Tracker</Brand>
          </div>
          <OnHand>
            <OnHandLabel>
              {currentMonthLabel()} &middot; on hand
            </OnHandLabel>
            <OnHandValue>{formatMoney(onHand)}</OnHandValue>
          </OnHand>
        </Header>

        <EnvelopeGrid>
          {categories.map((c) => (
            <EnvelopeCard
              key={c.id}
              category={c}
              status={statuses[c.id]}
            />
          ))}
        </EnvelopeGrid>

        {error ? <Banner $error>{error}</Banner> : null}
        {loading ? <Banner>Loading the ledger…</Banner> : null}

        {lastStatuses.length > 0 ? (
          <StatusRow>
            {lastStatuses.map((s) => (
              <BudgetStatusBadge
                key={`${s.categoryId}-${s.month}`}
                status={{
                  ...s,
                  budgetLimit: s.limit ?? s.budgetLimit,
                  remaining: (s.limit ?? s.budgetLimit ?? 0) - s.spent,
                }}
              />
            ))}
          </StatusRow>
        ) : null}

        <FilterBar
          keyword={keyword}
          onKeywordChange={setKeyword}
          formOpen={formOpen}
          onToggleForm={() => {
            setFormOpen((v) => !v);
            setEditing(null);
          }}
        />

        {formOpen ? (
          <TransactionForm
            categories={categories}
            initial={editing}
            onSubmit={handleSave}
            onCancel={() => {
              setEditing(null);
              setFormOpen(false);
            }}
          />
        ) : null}

        <TransactionList
          transactions={transactions}
          categories={categories}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </Inner>
    </Page>
  );
}
