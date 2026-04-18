import "server-only";

import JSZip from "jszip";
import { db } from "@/lib/db";
import { computeEntryHash, GENESIS_HASH } from "./forensic";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditPackageResult {
  exportId: string;
  entryCount: number;
  zipBuffer: Buffer;
  chainIntact: boolean;
}

/**
 * Generate an audit package ZIP for the given org and date range.
 * Contains: manifest.json, entries.jsonl, chain-proof.json, actors.json, README.txt
 */
export async function generateAuditPackage(
  orgId: string,
  dateRangeStart: Date,
  dateRangeEnd: Date,
  exportedByUserId: string,
): Promise<AuditPackageResult> {
  const entries = await db.auditLog.findMany({
    where: {
      orgId,
      createdAt: { gte: dateRangeStart, lte: dateRangeEnd },
    },
    orderBy: { createdAt: "asc" },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  // Build chain proof by verifying chained entries
  let chainIntact = true;
  let firstHash: string | null = null;
  let lastHash: string | null = null;
  let expectedPrevHash = GENESIS_HASH;

  const chainedEntries = entries.filter((e) => e.sequenceNum !== null);
  chainedEntries.sort((a, b) => Number(a.sequenceNum) - Number(b.sequenceNum));

  for (const entry of chainedEntries) {
    if (!firstHash) firstHash = entry.entryHash;
    lastHash = entry.entryHash;

    if (entry.prevHash !== expectedPrevHash) {
      chainIntact = false;
    }

    const recomputed = computeEntryHash({
      sequenceNum: entry.sequenceNum!,
      orgId: entry.orgId,
      actorId: entry.actorId,
      representedId: entry.representedId,
      proxyGrantId: entry.proxyGrantId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      prevHash: entry.prevHash ?? GENESIS_HASH,
    });

    if (recomputed !== entry.entryHash) {
      chainIntact = false;
    }

    expectedPrevHash = entry.entryHash ?? "";
  }

  // Build JSONL
  const jsonlLines = entries.map((e) =>
    JSON.stringify({
      id: e.id,
      sequenceNum: e.sequenceNum ? Number(e.sequenceNum) : null,
      orgId: e.orgId,
      actorId: e.actorId,
      representedId: e.representedId,
      proxyGrantId: e.proxyGrantId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      metadata: e.metadata,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      entryHash: e.entryHash,
      prevHash: e.prevHash,
      chainStatus: e.chainStatus,
      createdAt: e.createdAt.toISOString(),
    }),
  );

  // Deduplicate actors
  const actorsMap = new Map<string, { id: string; name: string | null; email: string | null }>();
  for (const e of entries) {
    if (!actorsMap.has(e.actor.id)) {
      actorsMap.set(e.actor.id, e.actor);
    }
  }

  const manifest = {
    version: "1.0",
    orgId,
    dateRangeStart: dateRangeStart.toISOString(),
    dateRangeEnd: dateRangeEnd.toISOString(),
    entryCount: entries.length,
    chainedEntryCount: chainedEntries.length,
    exportedBy: exportedByUserId,
    exportedAt: new Date().toISOString(),
    generator: "Slipwise One Forensic Audit v1.0",
  };

  const chainProof = {
    totalChainedEntries: chainedEntries.length,
    firstEntryHash: firstHash,
    lastEntryHash: lastHash,
    chainIntact,
    verifiedAt: new Date().toISOString(),
  };

  const readme = [
    "SLIPWISE ONE — FORENSIC AUDIT PACKAGE",
    "======================================",
    "",
    `Organization: ${orgId}`,
    `Date Range: ${dateRangeStart.toISOString()} to ${dateRangeEnd.toISOString()}`,
    `Entries: ${entries.length}`,
    `Chain Status: ${chainIntact ? "INTACT" : "BROKEN — tamper evidence detected"}`,
    "",
    "Files:",
    "  manifest.json     — Package metadata",
    "  entries.jsonl     — One JSON object per audit entry (newline-delimited)",
    "  chain-proof.json  — Cryptographic chain verification result",
    "  actors.json       — Deduplicated list of actors",
    "  README.txt        — This file",
    "",
    "Verification:",
    "  Each chained entry contains an entryHash (SHA-256) computed from its",
    "  canonical form and prevHash. To verify integrity:",
    "  1. Sort entries by sequenceNum ASC",
    "  2. For each entry, recompute SHA-256 of canonical(data + prevHash)",
    "  3. Compare to stored entryHash",
    "  4. Verify prevHash equals previous entry's entryHash",
  ].join("\n");

  // Build ZIP
  const zip = new JSZip();
  const folderName = `audit-package-${orgId}-${dateRangeStart.toISOString().slice(0, 10)}`;
  const folder = zip.folder(folderName)!;
  folder.file("manifest.json", JSON.stringify(manifest, null, 2));
  folder.file("entries.jsonl", jsonlLines.join("\n"));
  folder.file("chain-proof.json", JSON.stringify(chainProof, null, 2));
  folder.file("actors.json", JSON.stringify([...actorsMap.values()], null, 2));
  folder.file("README.txt", readme);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  // Persist export record
  const exportRecord = await db.auditPackageExport.create({
    data: {
      orgId,
      dateRangeStart,
      dateRangeEnd,
      entryCount: entries.length,
      fileSizeBytes: BigInt(zipBuffer.length),
      exportedByUserId,
      status: "COMPLETED",
    },
    select: { id: true },
  });

  return {
    exportId: exportRecord.id,
    entryCount: entries.length,
    zipBuffer,
    chainIntact,
  };
}
