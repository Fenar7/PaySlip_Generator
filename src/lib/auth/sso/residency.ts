/**
 * Data Residency Service — Phase 28 Sprint 28.3
 *
 * Ensures org data is stored in region-specific buckets.
 * Wires the DataResidencyConfig to the S3StorageAdapter for
 * region-aware object storage.
 */
"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type DataResidencyRegion = "US" | "EU" | "IN";

/**
 * Region-to-bucket mapping.
 * Each region has its own S3-compatible endpoint and bucket.
 */
const REGION_ENDPOINTS: Record<DataResidencyRegion, { endpoint: string; bucket: string; awsRegion: string }> = {
  US: {
    endpoint: process.env.S3_ENDPOINT_US || "https://s3.us-east-1.amazonaws.com",
    bucket: process.env.S3_BUCKET_US || "slipwise-data-us",
    awsRegion: "us-east-1",
  },
  EU: {
    endpoint: process.env.S3_ENDPOINT_EU || "https://s3.eu-west-1.amazonaws.com",
    bucket: process.env.S3_BUCKET_EU || "slipwise-data-eu",
    awsRegion: "eu-west-1",
  },
  IN: {
    endpoint: process.env.S3_ENDPOINT_IN || "https://s3.ap-south-1.amazonaws.com",
    bucket: process.env.S3_BUCKET_IN || "slipwise-data-in",
    awsRegion: "ap-south-1",
  },
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getDataResidencyConfig(): Promise<
  ActionResult<{ region: DataResidencyRegion; enforced: boolean; endpoint: string } | null>
> {
  const { organizationId } = await requireRole("admin");

  const config = await db.dataResidencyConfig.findUnique({
    where: { orgId: organizationId },
  });

  if (!config) {
    return { success: true, data: null };
  }

  const regionConfig = REGION_ENDPOINTS[config.region as DataResidencyRegion];

  return {
    success: true,
    data: {
      region: config.region as DataResidencyRegion,
      enforced: config.enforced,
      endpoint: regionConfig?.endpoint || config.bucketEndpoint || "",
    },
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function setDataResidency(
  region: DataResidencyRegion
): Promise<ActionResult<void>> {
  const { organizationId } = await requireRole("admin");

  const validRegions: DataResidencyRegion[] = ["US", "EU", "IN"];
  if (!validRegions.includes(region)) {
    return { success: false, error: "Invalid region. Must be US, EU, or IN." };
  }

  const regionConfig = REGION_ENDPOINTS[region];

  await db.dataResidencyConfig.upsert({
    where: { orgId: organizationId },
    create: {
      orgId: organizationId,
      region,
      bucketEndpoint: regionConfig.endpoint,
      enforced: true,
    },
    update: {
      region,
      bucketEndpoint: regionConfig.endpoint,
      enforced: true,
    },
  });

  return { success: true, data: undefined };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Resolve the storage endpoint for an organization.
 * Used by the S3StorageAdapter to route uploads to the correct bucket.
 */
export async function resolveStorageEndpoint(
  orgId: string
): Promise<{ endpoint: string; bucket: string; region: string }> {
  const config = await db.dataResidencyConfig.findUnique({
    where: { orgId },
  });

  const region: DataResidencyRegion = (config?.region as DataResidencyRegion) || "IN";
  const regionConfig = REGION_ENDPOINTS[region];

  return {
    endpoint: config?.bucketEndpoint || regionConfig.endpoint,
    bucket: regionConfig.bucket,
    region: regionConfig.awsRegion,
  };
}
