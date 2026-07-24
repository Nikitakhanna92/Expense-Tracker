import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Expense from "./components/Expense.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Expense />
  </StrictMode>,
);
