import { useEffect, useState } from "react";
import styled from "styled-components";
import CategorySelect from "./CategorySelect.jsx";
import { COLORS } from "../theme.js";
import { paiseToRupees, rupeesToPaise } from "../money.js";

const Slip = styled.form`
  background: ${COLORS.paper};
  border-radius: 10px;
  padding: 20px 22px;
  margin-bottom: 24px;
  background-image: radial-gradient(circle, ${COLORS.bg} 2px, transparent 2.5px);
  background-size: 16px 16px;
  background-position: top;
  background-repeat: repeat-x;
  background-origin: content-box;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 12px;

  @media (min-width: 640px) {
    grid-template-columns: 2fr 1fr 1fr 1fr;
  }
`;

const Input = styled.input`
  border: 1px solid ${COLORS.paperDim};
  border-radius: 6px;
  padding: 10px 12px;
  font-family: ${(p) =>
    p.$mono ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif"};
  font-size: 14px;
  color: ${COLORS.ink};
  background: #fff;

  &:focus {
    outline: 2px solid ${COLORS.gold};
    outline-offset: 1px;
  }
`;

const ErrorText = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 13px;
  color: ${COLORS.redDeep};
  font-weight: 600;
  margin: 0 0 12px;
`;

const SaveBtn = styled.button`
  background: ${COLORS.ink};
  color: ${COLORS.paper};
  border: none;
  border-radius: 6px;
  padding: 10px 18px;
  font-family: "Inter", sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: 2px solid ${COLORS.kraftDark};
    outline-offset: 2px;
  }
`;

function toDateInputValue(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const emptyForm = {
  amountRupees: "",
  description: "",
  date: toDateInputValue(),
  categoryId: "",
};

export default function TransactionForm({
  categories,
  initial,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (initial) {
      setForm({
        amountRupees: paiseToRupees(initial.amount),
        description: initial.description ?? "",
        date: toDateInputValue(initial.date),
        categoryId: initial.categoryId ?? categories[0]?.id ?? "",
      });
    } else {
      setForm({
        ...emptyForm,
        categoryId: categories[0]?.id ?? "",
        date: toDateInputValue(),
      });
    }
    setError("");
  }, [initial, categories]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const amount = rupeesToPaise(form.amountRupees);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!form.description.trim()) {
      setError("Add a description before saving.");
      return;
    }
    if (!form.categoryId) {
      setError("Pick a category.");
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        amount,
        description: form.description.trim(),
        date: new Date(`${form.date}T12:00:00.000Z`).toISOString(),
        categoryId: form.categoryId,
      });
      if (!isEdit) {
        setForm({
          ...emptyForm,
          categoryId: categories[0]?.id ?? "",
          date: toDateInputValue(),
        });
      }
    } catch (err) {
      setError(err.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Slip onSubmit={handleSubmit}>
      <Grid>
        <Input
          placeholder="Description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          style={{ gridColumn: "span 1" }}
          aria-label="Description"
        />
        <Input
          $mono
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={form.amountRupees}
          onChange={(e) => update("amountRupees", e.target.value)}
          aria-label="Amount in rupees"
        />
        <Input
          type="date"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
          aria-label="Date"
        />
        <CategorySelect
          categories={categories}
          value={form.categoryId}
          onChange={(v) => update("categoryId", v)}
        />
      </Grid>

      {error ? <ErrorText>{error}</ErrorText> : null}

      <SaveBtn type="submit" disabled={saving}>
        {saving ? "Saving…" : isEdit ? "Update ledger entry" : "Save to ledger"}
      </SaveBtn>
      {isEdit && onCancel ? (
        <SaveBtn
          type="button"
          onClick={onCancel}
          style={{ marginLeft: 10, background: COLORS.kraftDark }}
        >
          Cancel edit
        </SaveBtn>
      ) : null}
    </Slip>
  );
}
