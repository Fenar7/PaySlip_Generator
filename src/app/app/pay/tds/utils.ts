// TDS utility functions (sync helpers — cannot live in "use server" files)

/** TDS Section metadata with default withholding rates */
export const TDS_SECTIONS = {
  SECTION_194A: { label: "194A — Interest (other than on securities)", defaultRate: 10 },
  SECTION_194C: { label: "194C — Payment to contractor", defaultRate: 2 },
  SECTION_194J: { label: "194J — Professional/technical fees", defaultRate: 10 },
  SECTION_194H: { label: "194H — Commission or brokerage", defaultRate: 5 },
  SECTION_194I: { label: "194I — Rent", defaultRate: 10 },
  SECTION_194Q: { label: "194Q — Purchase of goods (> ₹50L)", defaultRate: 0.1 },
  OTHER: { label: "Other TDS section", defaultRate: 10 },
} as const;

/** Get current financial year (April–March), e.g. "2025-2026" */
export function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/** Get current quarter: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar */
export function getCurrentQuarter(): string {
  const month = new Date().getMonth();
  if (month >= 3 && month <= 5) return "Q1";
  if (month >= 6 && month <= 8) return "Q2";
  if (month >= 9 && month <= 11) return "Q3";
  return "Q4";
}
