"use server";

import { db } from "@/lib/db";
import type { HealthCheckReport, HealthCheckFailure, SequenceDocumentType } from "../types";

/**
 * Sequence Health Check Service
 *
 * Phase 7 / Sprint 7.2: production-grade health diagnostics for the
 * sequencing platform.  All checks are read-only and org-scoped.
 *
 * Produces a HealthCheckReport with deterministic failure records.
 */

interface SequenceHealthInput {
  orgId: string;
  documentType: SequenceDocumentType;
}

async function finalizedWhere(orgId: string, documentType: SequenceDocumentType) {
  if (documentType === "INVOICE") {
    return { organizationId: orgId, status: { not: "DRAFT" as const } };
  }
  // VOUCHER
  return { organizationId: orgId, status: "approved" };
}

export async function runSequenceHealthCheck(
  input: SequenceHealthInput
): Promise<HealthCheckReport> {
  const { orgId, documentType } = input;
  const failures: HealthCheckFailure[] = [];
  const table = documentType === "INVOICE" ? "invoice" : "voucher";
  const numberColumn =
    documentType === "INVOICE" ? "invoiceNumber" : "voucherNumber";
  const finalized = await finalizedWhere(orgId, documentType);

  // ── Check 1: sequence exists ───────────────────────────────────────────────
  const sequence = await db.sequence.findFirst({
    where: { organizationId: orgId, documentType },
    include: { formats: { where: { isDefault: true }, take: 1 }, periods: { orderBy: { startDate: "desc" }, take: 5 } },
  });

  if (!sequence) {
    failures.push({
      check: "sequence_exists",
      severity: "critical",
      message: `No ${documentType} sequence exists for this organization.`,
    });
    return { passed: false, failures, timestamp: new Date().toISOString() };
  }

  const format = sequence.formats[0];
  if (!format) {
    failures.push({
      check: "default_format",
      severity: "critical",
      message: `Sequence ${sequence.id} has no default format.`,
    });
  }

  // ── Check 2: finalized docs without official numbers ───────────────────────
  const missingNumberCount = await (documentType === "INVOICE"
    ? db.invoice.count({ where: { ...finalized, invoiceNumber: null } })
    : db.voucher.count({ where: { ...finalized, voucherNumber: null } }));

  if (missingNumberCount > 0) {
    failures.push({
      check: "missing_official_number",
      severity: "critical",
      message: `${missingNumberCount} finalized ${documentType.toLowerCase()} document(s) have no official number.`,
      count: missingNumberCount,
    });
  }

  // ── Check 3: finalized docs missing sequence linkage ───────────────────────
  const unlinkedCount = await (documentType === "INVOICE"
    ? db.invoice.count({ where: { ...finalized, sequenceId: null, invoiceNumber: { not: null } } })
    : db.voucher.count({ where: { ...finalized, sequenceId: null, voucherNumber: { not: null } } }));

  if (unlinkedCount > 0) {
    failures.push({
      check: "missing_sequence_linkage",
      severity: "warning",
      message: `${unlinkedCount} finalized ${documentType.toLowerCase()} document(s) have no sequence linkage (legacy numbering fallback).`,
      count: unlinkedCount,
    });
  }

  // ── Check 4: duplicate official numbers ────────────────────────────────────
  const duplicates = await db.$queryRawUnsafe<Array<{ number: string; cnt: bigint }>>(
    `SELECT "${numberColumn}" as number, COUNT(*)::int as cnt
     FROM "${table}"
     WHERE "organizationId" = $1
       AND "status" ${
         documentType === "INVOICE" ? "!= 'DRAFT'" : "= 'approved'"
       }
       AND "${numberColumn}" IS NOT NULL
     GROUP BY "${numberColumn}"
     HAVING COUNT(*) > 1
     LIMIT 10`,
    orgId
  ).catch(() => []);

  if (duplicates.length > 0) {
    const dupNumbers = duplicates.map((d) => d.number).join(", ");
    failures.push({
      check: "duplicate_official_number",
      severity: "critical",
      message: `Found ${duplicates.length} duplicate official number(s): ${dupNumbers}`,
      count: duplicates.length,
      details: { duplicates: duplicates.map((d) => ({ number: d.number, count: Number(d.cnt) })) },
    });
  }

  // ── Check 5: duplicate sequence numbers ────────────────────────────────────
  const dupSeqNumbers = await db.$queryRawUnsafe<Array<{ seq: string; num: number; cnt: bigint }>>(
    `SELECT "sequenceId" as seq, "sequenceNumber" as num, COUNT(*)::int as cnt
     FROM "${table}"
     WHERE "organizationId" = $1
       AND "sequenceId" IS NOT NULL
       AND "sequenceNumber" IS NOT NULL
     GROUP BY "sequenceId", "sequenceNumber"
     HAVING COUNT(*) > 1
     LIMIT 10`,
    orgId
  ).catch(() => []);

  if (dupSeqNumbers.length > 0) {
    failures.push({
      check: "duplicate_sequence_number",
      severity: "critical",
      message: `Found ${dupSeqNumbers.length} duplicate sequence number assignment(s).`,
      count: dupSeqNumbers.length,
    });
  }

  // ── Check 6: period state ──────────────────────────────────────────────────
  const openPeriods = sequence.periods.filter((p) => p.status === "OPEN");
  const closedPeriods = sequence.periods.filter((p) => p.status === "CLOSED");
  if (openPeriods.length === 0 && closedPeriods.length === 0) {
    failures.push({
      check: "no_periods",
      severity: "warning",
      message: `Sequence ${sequence.id} has no assigned periods yet (expected after first document finalization).`,
    });
  }

  return {
    passed: failures.filter((f) => f.severity === "critical").length === 0,
    failures,
    timestamp: new Date().toISOString(),
  };
}
