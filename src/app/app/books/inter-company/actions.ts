"use server";

import { db } from "@/lib/db";
import { requireGroupMember } from "@/lib/multi-entity/group-auth";
import { requireOrgContext } from "@/lib/auth/require-org";
import { logAudit } from "@/lib/audit";
import { createAndPostJournalTx } from "@/lib/accounting/journals";
import { SYSTEM_ACCOUNT_KEYS, getRequiredSystemAccountsTx } from "@/lib/accounting/accounts";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Create ICT (Draft) ──────────────────────────────────────────────────────

export async function createInterCompanyTransfer(input: {
  entityGroupId: string;
  destinationOrgId: string;
  amount: number;
  currency?: string;
  description: string;
  transferDate: string;
  referenceNumber?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (input.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    const { userId, orgId } = await requireGroupMember(input.entityGroupId);

    if (input.destinationOrgId === orgId) {
      return { success: false, error: "Source and destination must be different organisations" };
    }

    // Confirm destination is in the same group
    const destOrg = await db.organization.findUnique({
      where: { id: input.destinationOrgId },
      select: { entityGroupId: true, adminEntityGroup: { select: { id: true } } },
    });

    const destGroupId =
      destOrg?.entityGroupId ?? destOrg?.adminEntityGroup?.id ?? null;

    if (destGroupId !== input.entityGroupId) {
      return {
        success: false,
        error: "Destination organisation is not in the same entity group",
      };
    }

    const transfer = await db.interCompanyTransfer.create({
      data: {
        entityGroupId: input.entityGroupId,
        sourceOrgId: orgId,
        destinationOrgId: input.destinationOrgId,
        amount: input.amount,
        currency: input.currency ?? "INR",
        description: input.description.trim(),
        transferDate: new Date(input.transferDate),
        referenceNumber: input.referenceNumber?.trim() ?? null,
        createdByUserId: userId,
        status: "DRAFT",
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "ict.created",
      entityType: "InterCompanyTransfer",
      entityId: transfer.id,
      metadata: { amount: input.amount, destinationOrgId: input.destinationOrgId },
    });

    revalidatePath("/app/books/inter-company");
    return { success: true, data: { id: transfer.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create transfer";
    return { success: false, error: message };
  }
}

// ─── Approve ICT ─────────────────────────────────────────────────────────────

export async function approveInterCompanyTransfer(
  transferId: string,
): Promise<ActionResult<null>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const transfer = await db.interCompanyTransfer.findUnique({
      where: { id: transferId },
      select: {
        id: true,
        status: true,
        entityGroupId: true,
        entityGroup: { select: { adminOrgId: true } },
      },
    });

    if (!transfer) return { success: false, error: "Transfer not found" };

    // Only the group admin org may approve
    if (transfer.entityGroup.adminOrgId !== orgId) {
      return { success: false, error: "Only the group admin may approve transfers" };
    }

    if (transfer.status !== "PENDING_APPROVAL") {
      return {
        success: false,
        error: `Cannot approve a transfer in status: ${transfer.status}`,
      };
    }

    await db.interCompanyTransfer.update({
      where: { id: transferId },
      data: { status: "APPROVED", approvedByUserId: userId },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "ict.approved",
      entityType: "InterCompanyTransfer",
      entityId: transferId,
    });

    revalidatePath("/app/books/inter-company");
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve transfer";
    return { success: false, error: message };
  }
}

// ─── Submit for Approval ─────────────────────────────────────────────────────

export async function submitInterCompanyTransferForApproval(
  transferId: string,
): Promise<ActionResult<null>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const transfer = await db.interCompanyTransfer.findUnique({
      where: { id: transferId },
      select: { id: true, status: true, sourceOrgId: true },
    });

    if (!transfer) return { success: false, error: "Transfer not found" };
    if (transfer.sourceOrgId !== orgId) {
      return { success: false, error: "Only the source org may submit this transfer" };
    }
    if (transfer.status !== "DRAFT") {
      return { success: false, error: `Cannot submit a transfer in status: ${transfer.status}` };
    }

    await db.interCompanyTransfer.update({
      where: { id: transferId },
      data: { status: "PENDING_APPROVAL" },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "ict.submitted_for_approval",
      entityType: "InterCompanyTransfer",
      entityId: transferId,
    });

    revalidatePath("/app/books/inter-company");
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit transfer";
    return { success: false, error: message };
  }
}

// ─── Post ICT (creates balanced journal entries in both orgs) ────────────────

export async function postInterCompanyTransfer(
  transferId: string,
): Promise<ActionResult<null>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const transfer = await db.interCompanyTransfer.findUnique({
      where: { id: transferId },
      select: {
        id: true,
        status: true,
        entityGroupId: true,
      sourceOrgId: true,
      destinationOrgId: true,
      amount: true,
      currency: true,
      description: true,
      transferDate: true,
      referenceNumber: true,
      sourceJournalEntryId: true,
      destinationJournalEntryId: true,
      postedAt: true,
      entityGroup: { select: { adminOrgId: true } },
    },
  });

  if (!transfer) return { success: false, error: "Transfer not found" };
  if (transfer.entityGroup.adminOrgId !== orgId) {
    return { success: false, error: "Only the group admin may post transfers" };
  }
  if (transfer.status === "POSTED") {
    if (transfer.sourceJournalEntryId && transfer.destinationJournalEntryId) {
      return { success: true, data: null };
    }

    return {
      success: false,
      error: "Transfer is marked as posted but journal links are missing. Repair the transfer before retrying.",
    };
  }
  if (transfer.sourceJournalEntryId || transfer.destinationJournalEntryId || transfer.postedAt) {
    return {
      success: false,
      error: "Transfer already has posting metadata. Resolve the inconsistent state before retrying.",
    };
  }
  if (transfer.status !== "APPROVED") {
    return { success: false, error: `Cannot post a transfer in status: ${transfer.status}` };
  }

    const amount = Number(transfer.amount);
    const memo = transfer.referenceNumber
      ? `ICT ${transfer.referenceNumber}: ${transfer.description}`
      : `ICT: ${transfer.description}`;

    const [sourceJeId, destJeId] = await db.$transaction(async (tx) => {
      // Source org: Dr Inter-company Payable, Cr Cash/Bank
      const srcAccounts = await getRequiredSystemAccountsTx(tx, transfer.sourceOrgId, [
        SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
        SYSTEM_ACCOUNT_KEYS.SUSPENSE_UNMATCHED,
      ]);

      const srcJe = await createAndPostJournalTx(tx, {
        orgId: transfer.sourceOrgId,
        actorId: userId,
        entryDate: transfer.transferDate,
        sourceRef: transfer.referenceNumber ?? null,
        memo,
        source: "MANUAL",
        lines: [
          // Credit the bank (money leaving source)
          {
            accountId: srcAccounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id,
            debit: 0,
            credit: amount,
            description: memo,
          },
          // Debit suspense / inter-company receivable
          {
            accountId: srcAccounts[SYSTEM_ACCOUNT_KEYS.SUSPENSE_UNMATCHED].id,
            debit: amount,
            credit: 0,
            description: memo,
          },
        ],
      });

      // Destination org: Dr Cash/Bank, Cr Inter-company Receivable
      const destAccounts = await getRequiredSystemAccountsTx(tx, transfer.destinationOrgId, [
        SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
        SYSTEM_ACCOUNT_KEYS.SUSPENSE_UNMATCHED,
      ]);

      const destJe = await createAndPostJournalTx(tx, {
        orgId: transfer.destinationOrgId,
        actorId: userId,
        entryDate: transfer.transferDate,
        sourceRef: transfer.referenceNumber ?? null,
        memo,
        source: "MANUAL",
        lines: [
          // Debit bank (money arriving at destination)
          {
            accountId: destAccounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id,
            debit: amount,
            credit: 0,
            description: memo,
          },
          // Credit suspense / inter-company payable
          {
            accountId: destAccounts[SYSTEM_ACCOUNT_KEYS.SUSPENSE_UNMATCHED].id,
            debit: 0,
            credit: amount,
            description: memo,
          },
        ],
      });

      await tx.interCompanyTransfer.update({
        where: { id: transferId },
        data: {
          status: "POSTED",
          sourceJournalEntryId: srcJe.id,
          destinationJournalEntryId: destJe.id,
          postedAt: new Date(),
        },
      });

      return [srcJe.id, destJe.id];
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "ict.posted",
      entityType: "InterCompanyTransfer",
      entityId: transferId,
      metadata: { sourceJeId, destJeId },
    });

    revalidatePath("/app/books/inter-company");
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post transfer";
    return { success: false, error: message };
  }
}

// ─── Cancel ICT ──────────────────────────────────────────────────────────────

export async function cancelInterCompanyTransfer(
  transferId: string,
): Promise<ActionResult<null>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const transfer = await db.interCompanyTransfer.findUnique({
      where: { id: transferId },
      select: { id: true, status: true, sourceOrgId: true, entityGroup: { select: { adminOrgId: true } } },
    });

    if (!transfer) return { success: false, error: "Transfer not found" };

    const canCancel =
      transfer.sourceOrgId === orgId || transfer.entityGroup.adminOrgId === orgId;
    if (!canCancel) {
      return { success: false, error: "Access denied" };
    }

    if (transfer.status === "POSTED") {
      return { success: false, error: "Posted transfers cannot be cancelled. Create a reversal instead." };
    }

    if (transfer.status === "CANCELLED") {
      return { success: false, error: "Transfer is already cancelled" };
    }

    await db.interCompanyTransfer.update({
      where: { id: transferId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "ict.cancelled",
      entityType: "InterCompanyTransfer",
      entityId: transferId,
    });

    revalidatePath("/app/books/inter-company");
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel transfer";
    return { success: false, error: message };
  }
}

// ─── List ICTs ───────────────────────────────────────────────────────────────

export async function listInterCompanyTransfers(filters?: {
  entityGroupId?: string;
  status?: string;
}): Promise<ActionResult<Awaited<ReturnType<typeof fetchICTs>>>> {
  try {
    const { orgId } = await requireOrgContext();

    const where: Prisma.InterCompanyTransferWhereInput = {
      OR: [
        { sourceOrgId: orgId },
        { destinationOrgId: orgId },
        { entityGroup: { adminOrgId: orgId } },
      ],
      ...(filters?.entityGroupId ? { entityGroupId: filters.entityGroupId } : {}),
      ...(filters?.status ? { status: filters.status as never } : {}),
    };

    const transfers = await fetchICTs(where);
    return { success: true, data: transfers };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list transfers";
    return { success: false, error: message };
  }
}

async function fetchICTs(where: Prisma.InterCompanyTransferWhereInput) {
  return db.interCompanyTransfer.findMany({
    where,
    include: {
      sourceOrg: { select: { id: true, name: true, slug: true } },
      destinationOrg: { select: { id: true, name: true, slug: true } },
      entityGroup: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
