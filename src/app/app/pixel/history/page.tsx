import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { PixelHistoryClient } from "@/features/pixel/components/history/pixel-history-client";

export const metadata: Metadata = { title: "Pixel Job History | SW Pixel" };

export default async function PixelHistoryPage() {
  const { orgId, userId } = await requireOrgContext();

  const records = await db.pixelJobRecord.findMany({
    where: {
      orgId,
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      toolType: true,
      inputFileName: true,
      outputFileName: true,
      presetId: true,
      fileSizeBytes: true,
      createdAt: true,
    },
  });

  return <PixelHistoryClient records={records} />;
}
