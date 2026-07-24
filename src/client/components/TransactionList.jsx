import styled from "styled-components";
import { COLORS, CATEGORY_ACCENTS } from "../theme.js";
import { formatLedgerDate, formatMoney } from "../money.js";

const Panel = styled.div`
  background: ${COLORS.bgRaised};
  border: 1px solid ${COLORS.kraftDark};
  border-radius: 10px;
  padding: 6px 18px;
`;

const Empty = styled.p`
  font-family: "Inter", sans-serif;
  color: ${COLORS.textOnDarkMuted};
  font-size: 14px;
  padding: 20px 4px;
  margin: 0;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: ${(p) =>
    p.$last ? "none" : `1px dashed ${COLORS.kraftDark}`};
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const Meta = styled.div`
  min-width: 0;
`;

const Desc = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 14px;
  color: ${COLORS.textOnDark};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Sub = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 12px;
  color: ${COLORS.textOnDarkMuted};
  margin: 0;
`;

const Amount = styled.span`
  font-family: "IBM Plex Mono", monospace;
  font-size: 14px;
  color: ${COLORS.textOnDark};
  flex-shrink: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const GhostBtn = styled.button`
  border: 1px solid ${COLORS.kraftDark};
  background: transparent;
  color: ${COLORS.textOnDarkMuted};
  border-radius: 4px;
  padding: 4px 8px;
  font-family: "Inter", sans-serif;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: ${COLORS.textOnDark};
    border-color: ${COLORS.gold};
  }
`;

function accentFor(categories, categoryId) {
  const idx = categories.findIndex((c) => c.id === categoryId);
  if (idx < 0) return COLORS.kraftDark;
  return CATEGORY_ACCENTS[idx % CATEGORY_ACCENTS.length];
}

export default function TransactionList({
  transactions,
  categories = [],
  onEdit,
  onDelete,
}) {
  if (!transactions.length) {
    return (
      <Panel>
        <Empty>No entries match that search.</Empty>
      </Panel>
    );
  }

  return (
    <Panel>
      {transactions.map((t, i) => {
        const catName =
          t.category?.name ??
          categories.find((c) => c.id === t.categoryId)?.name ??
          "—";
        return (
          <Row key={t.id} $last={i === transactions.length - 1}>
            <Left>
              <Dot
                aria-hidden
                $color={accentFor(categories, t.categoryId)}
              />
              <Meta>
                <Desc>{t.description}</Desc>
                <Sub>
                  {catName} &middot; {formatLedgerDate(t.date)}
                </Sub>
              </Meta>
            </Left>
            <Actions>
              <Amount>{formatMoney(t.amount)}</Amount>
              {onEdit ? (
                <GhostBtn type="button" onClick={() => onEdit(t)}>
                  Edit
                </GhostBtn>
              ) : null}
              {onDelete ? (
                <GhostBtn type="button" onClick={() => onDelete(t)}>
                  Delete
                </GhostBtn>
              ) : null}
            </Actions>
          </Row>
        );
      })}
    </Panel>
  );
}
