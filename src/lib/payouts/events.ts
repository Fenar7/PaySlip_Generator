import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type DbLike = Prisma.TransactionClient | typeof db;

export interface MarketplacePayoutEventInput {
  publisherOrgId?: string | null;
  payoutRunId?: string | null;
  payoutItemId?: string | null;
  payoutAttemptId?: string | null;
  revenueId?: string | null;
  beneficiaryId?: string | null;
  actorId?: string | null;
  actorType?: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createMarketplacePayoutEvent(
  client: DbLike,
  input: MarketplacePayoutEventInput,
): Promise<void> {
  await client.marketplacePayoutEvent.create({
    data: {
      publisherOrgId: input.publisherOrgId ?? null,
      payoutRunId: input.payoutRunId ?? null,
      payoutItemId: input.payoutItemId ?? null,
      payoutAttemptId: input.payoutAttemptId ?? null,
      revenueId: input.revenueId ?? null,
      beneficiaryId: input.beneficiaryId ?? null,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? "user",
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      reason: input.reason ?? null,
      ...(input.metadata
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    },
  });
}
