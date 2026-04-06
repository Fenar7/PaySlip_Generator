import "server-only";

import { db } from "@/lib/db";

export async function trackStorageUsage(
  orgId: string,
  category: "export" | "proof" | "attachment" | "pixel",
  sizeBytes: number
): Promise<void> {
  await db.storageUsage.upsert({
    where: { orgId_category: { orgId, category } },
    create: {
      orgId,
      category,
      sizeBytes: BigInt(sizeBytes),
      fileCount: 1,
    },
    update: {
      sizeBytes: { increment: BigInt(sizeBytes) },
      fileCount: { increment: 1 },
    },
  });
}

export async function removeStorageUsage(
  orgId: string,
  category: string,
  sizeBytes: number
): Promise<void> {
  await db.storageUsage.upsert({
    where: { orgId_category: { orgId, category } },
    create: {
      orgId,
      category,
      sizeBytes: BigInt(0),
      fileCount: 0,
    },
    update: {
      sizeBytes: { decrement: BigInt(sizeBytes) },
      fileCount: { decrement: 1 },
    },
  });
}

export async function getStorageUsage(orgId: string) {
  return db.storageUsage.findMany({ where: { orgId } });
}

export async function getStorageSummary(orgId: string): Promise<{
  totalBytes: number;
  totalFiles: number;
  byCategory: Record<string, { bytes: number; files: number }>;
}> {
  const records = await db.storageUsage.findMany({ where: { orgId } });

  const byCategory: Record<string, { bytes: number; files: number }> = {};
  let totalBytes = 0;
  let totalFiles = 0;

  for (const r of records) {
    const bytes = Number(r.sizeBytes);
    byCategory[r.category] = { bytes, files: r.fileCount };
    totalBytes += bytes;
    totalFiles += r.fileCount;
  }

  return { totalBytes, totalFiles, byCategory };
}
