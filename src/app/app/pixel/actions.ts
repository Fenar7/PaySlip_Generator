"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { checkUsageLimit, recordUsageEvent } from "@/lib/usage-metering";
import type { PixelToolType } from "@/generated/prisma/client";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface SavePixelJobInput {
  toolType: PixelToolType;
  inputFileName: string;
  outputFileName?: string;
  presetId?: string;
  storagePath?: string;
  fileSizeBytes?: number;
  /** TTL in seconds; null means the record never expires */
  ttlSeconds?: number | null;
}

/**
 * Saves a completed pixel job to the authenticated user's vault history.
 * Enforces the PIXEL_JOB_SAVED plan limit before insertion and records
 * a usage event for metering.
 */
export async function savePixelJobToVault(
  input: SavePixelJobInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const limitCheck = await checkUsageLimit(orgId, "PIXEL_JOB_SAVED");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Pixel job storage limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to save more jobs.`,
      };
    }

    const expiresAt =
      input.ttlSeconds != null
        ? new Date(Date.now() + input.ttlSeconds * 1000)
        : null;

    const record = await db.pixelJobRecord.create({
      data: {
        orgId,
        userId,
        toolType: input.toolType,
        inputFileName: input.inputFileName,
        outputFileName: input.outputFileName ?? null,
        presetId: input.presetId ?? null,
        storagePath: input.storagePath ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        expiresAt,
      },
      select: { id: true },
    });

    void recordUsageEvent(orgId, "PIXEL_JOB_SAVED", 1, record.id).catch(() => {
      // Non-fatal; snapshot will pick it up on next compute
    });

    revalidatePath("/app/pixel/history");
    return { success: true, data: { id: record.id } };
  } catch (error) {
    console.error("savePixelJobToVault error:", error);
    return { success: false, error: "Failed to save pixel job" };
  }
}

/**
 * Deletes a pixel job record owned by the requesting user.
 * Records a -1 usage event so the snapshot stays accurate.
 */
export async function deletePixelJobRecord(
  recordId: string
): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.pixelJobRecord.findFirst({
      where: { id: recordId, orgId, userId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Record not found" };
    }

    await db.pixelJobRecord.delete({ where: { id: recordId } });

    void recordUsageEvent(orgId, "PIXEL_JOB_SAVED", -1, recordId).catch(() => {});

    revalidatePath("/app/pixel/history");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deletePixelJobRecord error:", error);
    return { success: false, error: "Failed to delete pixel job record" };
  }
}
