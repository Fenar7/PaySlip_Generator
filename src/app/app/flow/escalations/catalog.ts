export const SUPPORTED_BREACH_TYPES = [
  "approval_breach",
  "first_response_breach",
  "resolution_breach",
  "delivery_failure",
  "dead_letter_summary",
] as const;

export type SupportedBreachType = (typeof SUPPORTED_BREACH_TYPES)[number];
