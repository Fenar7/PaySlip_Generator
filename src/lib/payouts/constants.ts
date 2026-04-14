export const MARKETPLACE_PAYOUT_BENEFICIARY_STATUSES = [
  "pending_verification",
  "verified",
  "suspended",
] as const;

export const MARKETPLACE_REVENUE_PAYOUT_STATUSES = [
  "pending",
  "eligible",
  "on_hold",
  "queued_for_payout",
  "paid",
  "failed",
  "reversed",
] as const;

export const MARKETPLACE_PAYOUT_RUN_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export const MARKETPLACE_PAYOUT_ITEM_STATUSES = [
  "pending",
  "processing",
  "manual_review",
  "paid",
  "failed",
  "reversed",
  "cancelled",
] as const;

export const MARKETPLACE_PAYOUT_ATTEMPT_STATUSES = [
  "pending",
  "manual_review",
  "success",
  "failed",
] as const;

export type MarketplacePayoutBeneficiaryStatus =
  (typeof MARKETPLACE_PAYOUT_BENEFICIARY_STATUSES)[number];
export type MarketplaceRevenuePayoutStatus =
  (typeof MARKETPLACE_REVENUE_PAYOUT_STATUSES)[number];
export type MarketplacePayoutRunStatus =
  (typeof MARKETPLACE_PAYOUT_RUN_STATUSES)[number];
export type MarketplacePayoutItemStatus =
  (typeof MARKETPLACE_PAYOUT_ITEM_STATUSES)[number];
export type MarketplacePayoutAttemptStatus =
  (typeof MARKETPLACE_PAYOUT_ATTEMPT_STATUSES)[number];

export const OPEN_MARKETPLACE_PAYOUT_ITEM_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "processing",
  "manual_review",
]);

export const TERMINAL_MARKETPLACE_REVENUE_STATUSES: ReadonlySet<string> = new Set([
  "paid",
  "reversed",
]);

export const TERMINAL_MARKETPLACE_PAYOUT_RUN_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export const MANUAL_MARKETPLACE_PAYOUT_RUN_STATUSES: ReadonlySet<string> = new Set([
  "processing",
  "failed",
]);

export const MANUAL_MARKETPLACE_PAYOUT_ITEM_STATUSES: ReadonlySet<string> = new Set([
  "manual_review",
  "failed",
]);

export function isMarketplacePayoutItemOpen(status: string): boolean {
  return OPEN_MARKETPLACE_PAYOUT_ITEM_STATUSES.has(status);
}

export function isTerminalMarketplaceRevenueStatus(status: string): boolean {
  return TERMINAL_MARKETPLACE_REVENUE_STATUSES.has(status);
}

export function canManuallyResolveMarketplacePayoutItem(
  runStatus: string,
  itemStatus: string,
): boolean {
  return (
    MANUAL_MARKETPLACE_PAYOUT_RUN_STATUSES.has(runStatus) &&
    MANUAL_MARKETPLACE_PAYOUT_ITEM_STATUSES.has(itemStatus)
  );
}
