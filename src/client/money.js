/** Server money is paise; UI displays rupees. */

export function paiseToRupeesNumber(paise) {
  return Number(paise) / 100;
}

export function paiseToRupees(paise) {
  return paiseToRupeesNumber(paise).toFixed(2);
}

export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100);
}

/** Ledger & Twine style: ₹3,200 */
export function formatMoney(paise) {
  const rupees = Math.round(paiseToRupeesNumber(paise));
  return `\u20B9${rupees.toLocaleString("en-IN")}`;
}

export function formatRupees(paise) {
  return formatMoney(paise);
}

export function formatLedgerDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function currentMonthLabel(date = new Date()) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
