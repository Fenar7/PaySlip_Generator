import { env } from "@/lib/env";

export interface MarketplacePayoutDispatchInput {
  payoutRunId: string;
  payoutItemId: string;
  payoutAttemptId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  beneficiary: {
    id: string;
    payoutMethod: string;
    accountHolderName: string;
    bankAccountLast4?: string | null;
    providerBeneficiaryId?: string | null;
  };
}

export type MarketplacePayoutDispatchResult =
  | {
      outcome: "success";
      providerReferenceId?: string;
      providerRequestId?: string;
      responsePayload?: Record<string, unknown>;
    }
  | {
      outcome: "manual_review";
      providerRequestId?: string;
      failureCode: string;
      failureMessage: string;
      responsePayload?: Record<string, unknown>;
    }
  | {
      outcome: "failed";
      providerRequestId?: string;
      failureCode: string;
      failureMessage: string;
      retryable: boolean;
      responsePayload?: Record<string, unknown>;
    };

export interface MarketplacePayoutProvider {
  readonly name: string;
  dispatchPayout(
    input: MarketplacePayoutDispatchInput,
  ): Promise<MarketplacePayoutDispatchResult>;
}

class ManualMarketplacePayoutProvider implements MarketplacePayoutProvider {
  readonly name = "manual";

  async dispatchPayout(
    input: MarketplacePayoutDispatchInput,
  ): Promise<MarketplacePayoutDispatchResult> {
    return {
      outcome: "manual_review",
      failureCode: "manual_confirmation_required",
      failureMessage:
        "Manual payout confirmation is required before this settlement can be marked paid.",
      responsePayload: {
        payoutRunId: input.payoutRunId,
        payoutItemId: input.payoutItemId,
        idempotencyKey: input.idempotencyKey,
        beneficiaryId: input.beneficiary.id,
        payoutMethod: input.beneficiary.payoutMethod,
        bankAccountLast4: input.beneficiary.bankAccountLast4 ?? null,
      },
    };
  }
}

export function getMarketplacePayoutProvider(): MarketplacePayoutProvider {
  const configuredProvider = (
    env.MARKETPLACE_PAYOUT_PROVIDER ?? "manual"
  ).trim()
    .toLowerCase();

  if (!configuredProvider || configuredProvider === "manual") {
    return new ManualMarketplacePayoutProvider();
  }

  throw new Error(
    `Unsupported marketplace payout provider "${configuredProvider}". Configure MARKETPLACE_PAYOUT_PROVIDER=manual until a live provider adapter is available.`,
  );
}
