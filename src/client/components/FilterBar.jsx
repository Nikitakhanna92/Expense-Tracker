import { Search, Plus, X } from "lucide-react";
import styled from "styled-components";
import { COLORS } from "../theme.js";

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const Title = styled.h2`
  font-family: "Fraunces", serif;
  font-weight: 600;
  font-size: 22px;
  color: ${COLORS.textOnDark};
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;

  @media (min-width: 640px) {
    width: auto;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${COLORS.bgRaised};
  border: 1px solid ${COLORS.kraftDark};
  border-radius: 8px;
  padding: 0 12px;
  flex: 1;
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: ${COLORS.textOnDark};
  font-family: "Inter", sans-serif;
  font-size: 14px;
  padding: 10px 0;
  width: 100%;

  &::placeholder {
    color: ${COLORS.textOnDarkMuted};
  }

  &:focus {
    outline: none;
  }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.gold};
  color: ${COLORS.ink};
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-family: "Inter", sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:focus {
    outline: 2px solid ${COLORS.paper};
    outline-offset: 2px;
  }
`;

export default function FilterBar({
  keyword,
  onKeywordChange,
  formOpen,
  onToggleForm,
}) {
  return (
    <Row>
      <Title>The ledger</Title>
      <Controls>
        <SearchBox>
          <Search size={16} color={COLORS.textOnDarkMuted} aria-hidden />
          <SearchInput
            className="lt-input"
            placeholder="Search the ledger"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="Search transactions"
          />
        </SearchBox>
        <AddBtn type="button" onClick={onToggleForm}>
          {formOpen ? <X size={16} /> : <Plus size={16} />}
          {formOpen ? "Cancel" : "Add expense"}
        </AddBtn>
      </Controls>
    </Row>
  );
}
