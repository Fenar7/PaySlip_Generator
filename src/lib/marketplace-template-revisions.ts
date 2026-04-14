import { Prisma, type MarketplaceTemplateStatus } from "@/generated/prisma/client";

type PublisherDisplaySource = {
  publisherName: string;
  publisherOrg?: { name: string } | null;
};

export type MarketplaceRevisionSnapshotSource = PublisherDisplaySource & {
  name: string;
  description: string;
  templateType: string;
  version: string;
  templateData: Prisma.JsonValue;
  previewImageUrl: string;
  previewPdfUrl: string | null;
  status: MarketplaceTemplateStatus;
  publisherOrgId: string | null;
  createdAt?: Date;
  reviewedByUserId?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
  publishedAt?: Date | null;
};

export function resolveMarketplacePublisherDisplayName(source: PublisherDisplaySource): string {
  const orgName = source.publisherOrg?.name?.trim();
  if (orgName) {
    return orgName;
  }

  const publisherName = source.publisherName.trim();
  return publisherName || "Unknown publisher";
}

export function buildMarketplaceRevisionSnapshot(source: MarketplaceRevisionSnapshotSource) {
  return {
    version: source.version,
    name: source.name,
    description: source.description,
    templateType: source.templateType,
    publisherDisplayName: resolveMarketplacePublisherDisplayName(source),
    templateData: source.templateData as Prisma.InputJsonValue,
    previewImageUrl: source.previewImageUrl,
    previewPdfUrl: source.previewPdfUrl ?? null,
    status: source.status,
    createdByOrgId: source.publisherOrgId,
    reviewedByUserId: source.reviewedByUserId ?? null,
    reviewedAt: source.reviewedAt ?? null,
    reviewNotes: source.reviewNotes ?? null,
    rejectionReason: source.rejectionReason ?? null,
    publishedAt: source.publishedAt ?? null,
    ...(source.createdAt ? { createdAt: source.createdAt } : {}),
  };
}
