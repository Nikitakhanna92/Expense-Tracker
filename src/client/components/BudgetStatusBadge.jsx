import styled from "styled-components";
import { COLORS } from "../theme.js";
import { formatMoney } from "../money.js";

const Badge = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${(p) => (p.$over ? COLORS.redDeep : COLORS.greenDeep)};
  color: ${COLORS.paper};
  font-family: "Inter", sans-serif;
  font-size: 0.9rem;
`;

const Label = styled.span`
  opacity: 0.8;
  margin-right: 0.35rem;
`;

/** Compact status chip — envelopes are primary; this is for mutation feedback. */
export default function BudgetStatusBadge({ status }) {
  if (!status) return null;

  const limit = status.budgetLimit ?? status.limit ?? 0;
  const remaining = status.remaining ?? limit - status.spent;

  return (
    <Badge $over={status.overBudget} role="status">
      <span>
        <Label>Spent</Label>
        {formatMoney(status.spent)}
      </span>
      <span>
        <Label>Budget</Label>
        {formatMoney(limit)}
      </span>
      <span>
        <Label>Left</Label>
        {formatMoney(remaining)}
      </span>
      <strong>{status.overBudget ? "Over budget" : "Within budget"}</strong>
    </Badge>
  );
}
