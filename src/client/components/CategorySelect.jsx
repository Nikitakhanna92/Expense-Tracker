import styled from "styled-components";
import { COLORS } from "../theme.js";

const Select = styled.select`
  width: 100%;
  border: 1px solid ${COLORS.paperDim};
  border-radius: 6px;
  padding: 10px 12px;
  font-family: "Inter", sans-serif;
  font-size: 14px;
  color: ${COLORS.ink};
  background: #fff;

  &:focus {
    outline: 2px solid ${COLORS.gold};
    outline-offset: 1px;
  }
`;

export default function CategorySelect({
  categories,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "All categories",
  id = "categoryId",
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Category"
    >
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}
