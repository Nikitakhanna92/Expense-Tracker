import { AlertTriangle, Check } from "lucide-react";
import styled from "styled-components";
import { COLORS } from "../theme.js";
import { formatMoney } from "../money.js";

const Shell = styled.div`
  position: relative;
  border-radius: 4px 4px 10px 10px;
  background: ${COLORS.kraft};
  padding-top: 56px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
`;

const Flap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: ${COLORS.kraftDark};
  clip-path: polygon(0 0, 100% 0, 50% 100%);
`;

const Seal = styled.div`
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${(p) => (p.$over ? COLORS.red : COLORS.green)};
  border: 2px solid ${(p) => (p.$over ? COLORS.redDeep : COLORS.greenDeep)};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
`;

const Body = styled.div`
  padding: 12px 18px 18px;
`;

const Name = styled.h3`
  font-family: "Fraunces", serif;
  font-size: 19px;
  font-weight: 600;
  color: ${COLORS.ink};
  margin: 6px 0 2px;
  text-align: center;
`;

const Totals = styled.p`
  font-family: "IBM Plex Mono", monospace;
  font-size: 13px;
  color: ${COLORS.ink};
  opacity: 0.75;
  text-align: center;
  margin: 0 0 14px;
`;

const Track = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${COLORS.paperDim};
  overflow: hidden;
  margin-bottom: 10px;
`;

const Fill = styled.div`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => (p.$over ? COLORS.red : COLORS.greenDeep)};
  border-radius: 999px;
  transition: width 300ms ease;
`;

const Caption = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 12px;
  text-align: center;
  margin: 0;
  color: ${(p) => (p.$over ? COLORS.redDeep : COLORS.ink)};
  opacity: ${(p) => (p.$over ? 1 : 0.65)};
  font-weight: ${(p) => (p.$over ? 600 : 400)};
`;

/**
 * Budget envelope card. Expects server status (paise):
 * { budgetLimit | limit, spent, overBudget?, remaining? }
 */
export default function EnvelopeCard({ category, status }) {
  const limit = status?.budgetLimit ?? status?.limit ?? category.monthlyBudgetLimit ?? 0;
  const spent = status?.spent ?? 0;
  const isOver = status?.overBudget ?? spent > limit;
  const remaining = status?.remaining ?? limit - spent;
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

  return (
    <Shell>
      <Flap aria-hidden="true" />
      <Seal $over={isOver} aria-hidden="true">
        {isOver ? (
          <AlertTriangle size={18} color={COLORS.paper} />
        ) : (
          <Check size={18} color={COLORS.paper} />
        )}
      </Seal>
      <Body>
        <Name>{category.name}</Name>
        <Totals>
          {formatMoney(spent)} of {formatMoney(limit)}
        </Totals>
        <Track>
          <Fill $pct={pct} $over={isOver} />
        </Track>
        <Caption $over={isOver}>
          {isOver
            ? `${formatMoney(Math.abs(remaining))} over budget`
            : `${formatMoney(remaining)} left this month`}
        </Caption>
      </Body>
    </Shell>
  );
}
