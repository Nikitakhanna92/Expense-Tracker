import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Check, AlertTriangle } from "lucide-react";
import {
  createTransaction,
  getCategoryStatus,
  listCategories,
  listTransactions,
} from "../api.js";

const COLORS = {
  bg: "#F3EEE4",
  bgRaised: "#FFFCF7",
  paper: "#FFFDF8",
  paperDim: "#E5DCCB",
  kraft: "#D2A06A",
  kraftDark: "#B07D4A",
  ink: "#2B2320",
  textOnDark: "#2B2320",
  textOnDarkMuted: "#6E6256",
  gold: "#A67C2A",
  green: "#6B8F5B",
  greenDeep: "#3E5233",
  red: "#C1453A",
  redDeep: "#8B2E26",
  blueMuted: "#5B7A8C",
  border: "#D9CDB8",
  shadow: "rgba(43, 35, 32, 0.1)",
};

const ACCENTS = [COLORS.gold, COLORS.green, COLORS.kraftDark, COLORS.blueMuted];

/** Display helper: n is rupees (API stores paise; convert at the boundary). */
function formatMoney(n) {
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
}

function formatDate(iso) {
  const raw = typeof iso === "string" ? iso.slice(0, 10) : "";
  const d = new Date(raw + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function paiseToRupees(paise) {
  return Number(paise) / 100;
}

function rupeesToPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel() {
  return new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function EnvelopeCard({ category, spent }) {
  const pct = Math.min((spent / category.limit) * 100, 100);
  const isOver = spent > category.limit;
  const remaining = category.limit - spent;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "4px 4px 10px 10px",
        background: COLORS.kraft,
        paddingTop: 56,
        boxShadow: `0 8px 20px ${COLORS.shadow}`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: COLORS.kraftDark,
          clipPath: "polygon(0 0, 100% 0, 50% 100%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: isOver ? COLORS.red : COLORS.green,
          border: `2px solid ${isOver ? COLORS.redDeep : COLORS.greenDeep}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {isOver ? (
          <AlertTriangle size={18} color={COLORS.paper} />
        ) : (
          <Check size={18} color={COLORS.paper} />
        )}
      </div>

      <div style={{ padding: "12px 18px 18px" }}>
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 19,
            fontWeight: 600,
            color: COLORS.ink,
            margin: "6px 0 2px",
            textAlign: "center",
          }}
        >
          {category.name}
        </h3>

        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: COLORS.ink,
            opacity: 0.75,
            textAlign: "center",
            margin: "0 0 14px",
          }}
        >
          {formatMoney(spent)} of {formatMoney(category.limit)}
        </p>

        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: COLORS.paperDim,
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              height: "100%",
              width: pct + "%",
              background: isOver ? COLORS.red : COLORS.greenDeep,
              borderRadius: 999,
              transition: "width 300ms ease",
            }}
          />
        </div>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            textAlign: "center",
            margin: 0,
            color: isOver ? COLORS.redDeep : COLORS.ink,
            opacity: isOver ? 1 : 0.65,
            fontWeight: isOver ? 600 : 400,
          }}
        >
          {isOver
            ? `${formatMoney(Math.abs(remaining))} over budget`
            : `${formatMoney(remaining)} left this month`}
        </p>
      </div>
    </div>
  );
}

/**
 * Nikita's Expense Tracker. Data from GET /api/categories + /api/transactions.
 * Envelope spent/limit from GET /api/categories/:id/status (authoritative).
 */
export default function Expense() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  /** categoryId -> spent in rupees from status API */
  const [spentByCategory, setSpentByCategory] = useState({});
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: todayInputValue(),
  });

  const refresh = useCallback(async () => {
    setLoadError("");
    const [cats, txs] = await Promise.all([
      listCategories(),
      listTransactions(),
    ]);

    const withAccent = (Array.isArray(cats) ? cats : []).map((c, i) => ({
      id: c.id,
      name: c.name,
      // EnvelopeCard expects rupees in `limit` (design units)
      limit: paiseToRupees(c.monthlyBudgetLimit),
      accent: ACCENTS[i % ACCENTS.length],
      monthlyBudgetLimit: c.monthlyBudgetLimit,
    }));

    const statusEntries = await Promise.all(
      withAccent.map(async (c) => {
        try {
          const status = await getCategoryStatus(c.id);
          return [c.id, paiseToRupees(status.spent ?? 0)];
        } catch {
          return [c.id, 0];
        }
      }),
    );

    setCategories(withAccent);
    setTransactions(Array.isArray(txs) ? txs : []);
    setSpentByCategory(Object.fromEntries(statusEntries));
    setForm((prev) => ({
      ...prev,
      categoryId: prev.categoryId || withAccent[0]?.id || "",
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.message ||
              "Could not reach the ledger API. Is the server running on :3000?",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const totalLimit = categories.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categories.reduce(
    (s, c) => s + (spentByCategory[c.id] ?? 0),
    0,
  );
  const onHand = totalLimit - totalSpent;

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? transactions
      : transactions.filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            categoryName(t.categoryId).toLowerCase().includes(q),
        );
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
    // categoryName closes over categories
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, search, categories]);

  async function handleAdd() {
    setFormError("");
    setSaving(true);
    try {
      const amountPaise = rupeesToPaise(form.amount);
      await createTransaction({
        amount: amountPaise,
        description: form.description.trim(),
        categoryId: form.categoryId,
        date: new Date(`${form.date}T12:00:00.000Z`).toISOString(),
      });
      await refresh();
      setForm({
        amount: "",
        description: "",
        categoryId: categories[0]?.id || "",
        date: form.date,
      });
      setFormOpen(false);
    } catch (err) {
      // Prefer server 4xx { error } over client-only messages
      setFormError(err.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #EDE6D8 100%)`,
        minHeight: "100%",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        html, body { margin: 0; background: ${COLORS.bg}; }
        .lt-input::placeholder { color: ${COLORS.textOnDarkMuted}; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.gold,
                margin: "0 0 6px",
              }}
            >
              Envelope budgeting, kept honest
            </p>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: 40,
                color: COLORS.textOnDark,
                margin: 0,
              }}
            >
              Nikita's Expense Tracker
            </h1>
          </div>

          <div
            style={{
              background: COLORS.bgRaised,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "12px 20px",
              minWidth: 180,
              boxShadow: `0 4px 14px ${COLORS.shadow}`,
            }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: COLORS.textOnDarkMuted,
                margin: "0 0 4px",
              }}
            >
              {monthLabel()} &middot; on hand
            </p>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 26,
                fontWeight: 500,
                color: COLORS.textOnDark,
                margin: 0,
              }}
            >
              {formatMoney(onHand)}
            </p>
          </div>
        </div>

        {/* Envelopes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {loading && categories.length === 0 ? (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: COLORS.textOnDarkMuted,
                fontSize: 14,
                margin: 0,
                gridColumn: "1 / -1",
              }}
            >
              Opening the envelopes…
            </p>
          ) : null}
          {categories.map((c) => (
            <EnvelopeCard
              key={c.id}
              category={c}
              spent={spentByCategory[c.id] ?? 0}
            />
          ))}
        </div>

        {loadError ? (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: COLORS.red,
              fontWeight: 600,
              margin: "0 0 16px",
            }}
          >
            {loadError}
          </p>
        ) : null}

        {/* Ledger controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 22,
              color: COLORS.textOnDark,
              margin: 0,
              marginBottom:"10px",
              marginTop:"10px"
            }}
          >
            The ledger
          </h2>

          <div className="flex gap-3 w-full sm:w-auto">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: COLORS.bgRaised,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "0 12px",
                flex: 1,
                boxShadow: `0 2px 8px ${COLORS.shadow}`,

                marginBottom:"10px",
        
              }}
            >
              <Search size={16} color={COLORS.textOnDarkMuted} style={{ marginTop: "10px", marginBottom: "10px" }} />
              <input
                className="lt-input focus:outline-none"
                placeholder="Search the ledger"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.textOnDark,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  width: "100%",
    
                }}
              />
            </div>

            <button
              onClick={() => {
                setFormOpen((v) => !v);
                setFormError("");
              }}
              className="focus:outline-none focus:ring-2"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: COLORS.gold,
                color: COLORS.ink,
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginBottom:"10px",
                marginTop:"10px"
              }}
            >
              {formOpen ? <X size={16} /> : <Plus size={16} />}
              {formOpen ? "Cancel" : "Add expense"}
            </button>
          </div>
        </div>

        {/* Add expense slip */}
        {formOpen && (
          <div
            style={{
              background: COLORS.paper,
              borderRadius: 10,
              padding: "20px 22px",
              marginBottom: 24,
              backgroundImage: `radial-gradient(circle, ${COLORS.border} 2px, transparent 2.5px)`,
              backgroundSize: "16px 16px",
              backgroundPosition: "top",
              backgroundRepeat: "repeat-x",
              backgroundOrigin: "content-box",
              boxShadow: `0 8px 22px ${COLORS.shadow}`,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="focus:outline-none focus:ring-2"
                style={{
                  gridColumn: "span 2",
                  border: `1px solid ${COLORS.paperDim}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: COLORS.ink,
                  background: "#fff",
                }}
              />
              <input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="focus:outline-none focus:ring-2"
                style={{
                  border: `1px solid ${COLORS.paperDim}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14,
                  color: COLORS.ink,
                  background: "#fff",
                }}
              />
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="focus:outline-none focus:ring-2"
                style={{
                  border: `1px solid ${COLORS.paperDim}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: COLORS.ink,
                  background: "#fff",
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="focus:outline-none focus:ring-2"
              style={{
                border: `1px solid ${COLORS.paperDim}`,
                borderRadius: 6,
                padding: "10px 12px",
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: COLORS.ink,
                background: "#fff",
                marginBottom: 12,
              }}
            />

            {formError && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: COLORS.redDeep,
                  fontWeight: 600,
                  margin: "0 0 12px",
                }}
              >
                {formError}
              </p>
            )}

            <button
              onClick={handleAdd}
              disabled={saving}
              className="focus:outline-none focus:ring-2"
              style={{
                background: COLORS.ink,
                color: COLORS.paper,
                border: "none",
                borderRadius: 6,
                padding: "10px 18px",
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save to ledger"}
            </button>
          </div>
        )}

        {/* Transactions list */}
        <div
          style={{
            background: COLORS.bgRaised,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "6px 18px",
            boxShadow: `0 4px 16px ${COLORS.shadow}`,
          }}
        >
          {loading ? (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: COLORS.textOnDarkMuted,
                fontSize: 14,
                padding: "20px 4px",
                margin: 0,
              }}
            >
              Turning the ledger pages…
            </p>
          ) : filtered.length === 0 ? (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: COLORS.textOnDarkMuted,
                fontSize: 14,
                padding: "20px 4px",
                margin: 0,
              }}
            >
              No entries match that search.
            </p>
          ) : (
            filtered.map((t, i) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 4px",
                    borderBottom:
                      i === filtered.length - 1
                        ? "none"
                        : `1px dashed ${COLORS.border}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cat?.accent,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 14,
                          color: COLORS.textOnDark,
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.description}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 12,
                          color: COLORS.textOnDarkMuted,
                          margin: 0,
                        }}
                      >
                        {cat?.name} &middot; {formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 14,
                      color: COLORS.textOnDark,
                      flexShrink: 0,
                    }}
                  >
                    {formatMoney(paiseToRupees(t.amount))}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
