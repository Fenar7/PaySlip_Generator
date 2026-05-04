"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  SequenceChangeType,
  SequenceDocumentType,
} from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateSnapshotParams {
  sequenceId: string;
  orgId: string;
  changedById: string;
  changeType: SequenceChangeType;
  changeSummary?: string;
  changeNote?: string;
  tx?: Prisma.TransactionClient;
}

export interface PeriodSnapshotEntry {
  periodId: string;
  startDate: string;
  endDate: string;
  currentCounter: number;
  status: string;
}

export interface SequenceSnapshotEntry {
  id: string;
  version: number;
  name: string;
  documentType: SequenceDocumentType;
  periodicity: string;
  isActive: boolean;
  formatString: string;
  startCounter: number;
  counterPadding: number;
  totalConsumed: number;
  periodsSnapshot: PeriodSnapshotEntry[];
  changeType: SequenceChangeType;
  changeSummary: string | null;
  changeNote: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    name: string;
  } | null;
}

export interface OrgSnapshotGroup {
  documentType: SequenceDocumentType;
  sequences: {
    sequenceId: string;
    sequenceName: string;
    isActive: boolean;
    snapshotCount: number;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSnapshotDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Core Operations ────────────────────────────────────────────────────────

/**
 * Create a snapshot of the current sequence configuration.
 *
 * Must be called BEFORE the mutation is applied so the snapshot
 * captures the pre-change state.  Called inside mutations in
 * sequence-admin.ts at write time.
 *
 * The version is auto-incremented per sequence.
 */
export async function createSnapshot(
  params: CreateSnapshotParams,
): Promise<{ id: string; version: number }> {
  const executor = params.tx ?? db;

  const sequence = await executor.sequence.findUnique({
    where: { id: params.sequenceId },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
      periods: { orderBy: { startDate: "desc" } },
    },
  });

  if (!sequence) {
    throw new Error(`Sequence ${params.sequenceId} not found`);
  }

  const format = sequence.formats[0];
  if (!format) {
    throw new Error(`Sequence ${params.sequenceId} has no default format`);
  }

  // Determine next version
  const latest = await executor.sequenceSnapshot.findFirst({
    where: { sequenceId: params.sequenceId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // Compute total consumed
  const totalConsumed = sequence.periods.reduce(
    (sum, p) => sum + p.currentCounter,
    0,
  );

  const periodsSnapshot: PeriodSnapshotEntry[] = sequence.periods.map((p) => ({
    periodId: p.id,
    startDate: formatSnapshotDate(p.startDate),
    endDate: formatSnapshotDate(p.endDate),
    currentCounter: p.currentCounter,
    status: p.status,
  }));

  const snapshot = await executor.sequenceSnapshot.create({
    data: {
      organizationId: params.orgId,
      sequenceId: params.sequenceId,
      version: nextVersion,
      name: sequence.name,
      documentType: sequence.documentType,
      periodicity: sequence.periodicity,
      isActive: sequence.isActive,
      formatString: format.formatString,
      startCounter: format.startCounter,
      counterPadding: format.counterPadding,
      totalConsumed,
      periodsSnapshot: periodsSnapshot as unknown as Prisma.InputJsonValue,
      changeType: params.changeType,
      changeSummary: params.changeSummary ?? null,
      changeNote: params.changeNote ?? null,
      changedById: params.changedById,
    },
  });

  return { id: snapshot.id, version: nextVersion };
}

/**
 * Get all snapshots for a sequence, ordered by most recent first.
 */
export async function getSequenceSnapshots(
  orgId: string,
  sequenceId: string,
): Promise<SequenceSnapshotEntry[]> {
  const snapshots = await db.sequenceSnapshot.findMany({
    where: { organizationId: orgId, sequenceId },
    orderBy: { version: "desc" },
    include: {
      changedBy: { select: { id: true, name: true } },
    },
  });

  return snapshots.map((s) => ({
    id: s.id,
    version: s.version,
    name: s.name,
    documentType: s.documentType,
    periodicity: s.periodicity,
    isActive: s.isActive,
    formatString: s.formatString,
    startCounter: s.startCounter,
    counterPadding: s.counterPadding,
    totalConsumed: s.totalConsumed,
    periodsSnapshot: s.periodsSnapshot as unknown as PeriodSnapshotEntry[],
    changeType: s.changeType,
    changeSummary: s.changeSummary,
    changeNote: s.changeNote,
    createdAt: s.createdAt.toISOString(),
    changedBy: s.changedBy
      ? { id: s.changedBy.id, name: s.changedBy.name }
      : null,
  }));
}

/**
 * Get a single snapshot by id.
 */
export async function getSnapshot(
  orgId: string,
  snapshotId: string,
): Promise<SequenceSnapshotEntry | null> {
  const snapshot = await db.sequenceSnapshot.findFirst({
    where: { id: snapshotId, organizationId: orgId },
    include: {
      changedBy: { select: { id: true, name: true } },
    },
  });

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    version: snapshot.version,
    name: snapshot.name,
    documentType: snapshot.documentType,
    periodicity: snapshot.periodicity,
    isActive: snapshot.isActive,
    formatString: snapshot.formatString,
    startCounter: snapshot.startCounter,
    counterPadding: snapshot.counterPadding,
    totalConsumed: snapshot.totalConsumed,
    periodsSnapshot: snapshot.periodsSnapshot as unknown as PeriodSnapshotEntry[],
    changeType: snapshot.changeType,
    changeSummary: snapshot.changeSummary,
    changeNote: snapshot.changeNote,
    createdAt: snapshot.createdAt.toISOString(),
    changedBy: snapshot.changedBy
      ? { id: snapshot.changedBy.id, name: snapshot.changedBy.name }
      : null,
  };
}

/**
 * Get the current live sequence config for comparison with a snapshot.
 */
export async function getCurrentSequenceState(
  orgId: string,
  sequenceId: string,
): Promise<{
  name: string;
  periodicity: string;
  isActive: boolean;
  formatString: string;
  startCounter: number;
  counterPadding: number;
  totalConsumed: number;
  periods: PeriodSnapshotEntry[];
} | null> {
  const sequence = await db.sequence.findFirst({
    where: { id: sequenceId, organizationId: orgId },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
      periods: { orderBy: { startDate: "desc" } },
    },
  });

  if (!sequence) return null;

  const format = sequence.formats[0];
  if (!format) return null;

  const totalConsumed = sequence.periods.reduce(
    (sum, p) => sum + p.currentCounter,
    0,
  );

  return {
    name: sequence.name,
    periodicity: sequence.periodicity,
    isActive: sequence.isActive,
    formatString: format.formatString,
    startCounter: format.startCounter,
    counterPadding: format.counterPadding,
    totalConsumed,
    periods: sequence.periods.map((p) => ({
      periodId: p.id,
      startDate: formatSnapshotDate(p.startDate),
      endDate: formatSnapshotDate(p.endDate),
      currentCounter: p.currentCounter,
      status: p.status,
    })),
  };
}

/**
 * List all sequences for an org with their snapshot counts,
 * grouped by document type.  Used for the folder-tree browser.
 */
export async function listAllOrgSnapshots(
  orgId: string,
): Promise<OrgSnapshotGroup[]> {
  const sequences = await db.sequence.findMany({
    where: { organizationId: orgId },
    orderBy: [{ documentType: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      documentType: true,
      isActive: true,
      _count: { select: { snapshots: true } },
    },
  });

  const grouped = new Map<SequenceDocumentType, OrgSnapshotGroup["sequences"]>();

  for (const seq of sequences) {
    const group = grouped.get(seq.documentType) ?? [];
    group.push({
      sequenceId: seq.id,
      sequenceName: seq.name,
      isActive: seq.isActive,
      snapshotCount: seq._count.snapshots,
    });
    grouped.set(seq.documentType, group);
  }

  return Array.from(grouped.entries()).map(([documentType, sequences]) => ({
    documentType,
    sequences,
  }));
}

/**
 * Lazy backfill: if a sequence has no snapshots, create v1 from
 * the current live state.  Call on first read access so no separate
 * deployment / migration script is needed.
 */
export async function backfillSnapshotIfNeeded(
  orgId: string,
  sequenceId: string,
  changedById: string,
): Promise<void> {
  const existing = await db.sequenceSnapshot.findFirst({
    where: { sequenceId },
    select: { id: true },
  });

  if (existing) return;

  const sequence = await db.sequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) return;

  await createSnapshot({
    sequenceId,
    orgId,
    changedById,
    changeType: "CREATED",
    changeSummary: "Initial snapshot (backfilled)",
  });
}
