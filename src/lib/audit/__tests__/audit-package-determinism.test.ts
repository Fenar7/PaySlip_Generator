import { describe, expect, it } from "vitest";
import { canonicalize } from "@/lib/audit/forensic";

/**
 * These tests verify that the audit package canonicalization produces
 * byte-stable JSON for realistic package contents — not just for
 * simple object key sorting.
 */
describe("audit package canonicalization determinism", () => {
  it("produces identical output for the same package content emitted twice", () => {
    const pkg = buildRealisticPackage();
    const run1 = canonicalize(pkg);
    const run2 = canonicalize(pkg);
    expect(run1).toBe(run2);
  });

  it("is order-independent for objects with different key insertion orders", () => {
    const pkgA = {
      orgId: "org-1",
      fiscalPeriod: { id: "fp-1", label: "April 2026", status: "CLOSED" },
      packageVersion: 2,
      generatedAt: "2026-04-30T00:00:00.000Z",
    };
    const pkgB = {
      packageVersion: 2,
      generatedAt: "2026-04-30T00:00:00.000Z",
      orgId: "org-1",
      fiscalPeriod: { status: "CLOSED", label: "April 2026", id: "fp-1" },
    };
    expect(canonicalize(pkgA)).toBe(canonicalize(pkgB));
  });

  it("preserves array order (array content is order-sensitive in audit packages)", () => {
    const pkgWithJournals = (order: "asc" | "desc") => ({
      journalRegister: [
        { id: order === "asc" ? "je-1" : "je-2", entryDate: "2026-04-01" },
        { id: order === "asc" ? "je-2" : "je-1", entryDate: "2026-04-15" },
      ],
    });
    // Arrays are NOT sorted by canonicalize — so different orderings produce
    // different canonical strings. This asserts our assumption about array handling.
    expect(canonicalize(pkgWithJournals("asc"))).not.toBe(
      canonicalize(pkgWithJournals("desc")),
    );
  });

  it("produces the same canonical hash for a package with deeply nested reports", () => {
    const pkg = buildRealisticPackage();
    const normalizedPkg = JSON.parse(JSON.stringify(pkg));
    // Simulating what exportBooksAuditPackageJson does: JSON.stringify(JSON.parse(canonicalize(...)))
    const output1 = JSON.stringify(JSON.parse(canonicalize(normalizedPkg)), null, 2);
    const output2 = JSON.stringify(JSON.parse(canonicalize(normalizedPkg)), null, 2);
    expect(output1).toBe(output2);
    expect(output1).not.toBe("");
  });

  it("produces different canonical output when content differs", () => {
    const base = buildRealisticPackage();
    const modified = {
      ...base,
      closeRun: {
        ...base.closeRun,
        blockerCount: base.closeRun.blockerCount + 1,
      },
    };
    expect(canonicalize(base)).not.toBe(canonicalize(modified));
  });

  it("handles date strings, numbers, nulls without coercion", () => {
    const pkg = {
      amount: 1000.5,
      date: "2026-04-30T00:00:00.000Z",
      note: null,
      count: 0,
    };
    const result = canonicalize(pkg);
    expect(result).toContain("1000.5");
    expect(result).toContain("2026-04-30T00:00:00.000Z");
    expect(result).toContain("null");
    expect(result).toContain("0");
  });
});

function buildRealisticPackage() {
  return {
    generatedAt: "2026-04-30T00:00:00.000Z",
    packageVersion: 2,
    orgId: "org-abc123",
    fiscalPeriod: {
      id: "fp-april-2026",
      label: "April 2026",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      status: "CLOSED",
    },
    closeRun: {
      id: "cr-001",
      status: "COMPLETED",
      blockerCount: 0,
      completedAt: "2026-04-30T09:00:00.000Z",
      tasks: [
        { code: "ar_aging_reviewed", status: "completed" },
        { code: "bank_reconciliation_complete", status: "completed" },
        { code: "journals_posted", status: "completed" },
      ],
    },
    reports: {
      profitAndLoss: { revenue: 500000, expenses: 320000, netIncome: 180000 },
      trialBalance: [
        { accountCode: "1001", debit: 50000, credit: 0 },
        { accountCode: "4001", debit: 0, credit: 500000 },
      ],
    },
    journalRegister: [
      {
        id: "je-001",
        entryNumber: "JE-001",
        entryDate: "2026-04-01",
        status: "POSTED",
        totalDebit: 10000,
        totalCredit: 10000,
        lines: [{ id: "jl-1" }, { id: "jl-2" }],
      },
      {
        id: "je-002",
        entryNumber: "JE-002",
        entryDate: "2026-04-15",
        status: "POSTED",
        totalDebit: 25000,
        totalCredit: 25000,
        lines: [{ id: "jl-3" }, { id: "jl-4" }],
      },
    ],
    reconciliationEvidence: {
      eventCount: 2,
      events: [
        { id: "ev-1", action: "bank.reconciliation.confirm", actorId: "user-1", createdAt: "2026-04-20T10:00:00.000Z" },
        { id: "ev-2", action: "bank.reconciliation.confirm", actorId: "user-1", createdAt: "2026-04-21T10:00:00.000Z" },
      ],
    },
    reopenedPeriods: [],
    attachmentIndex: [
      { id: "att-1", entityType: "vendor_bill", entityId: "vb-1", fileName: "invoice.pdf", size: 102400, createdAt: "2026-04-05T08:00:00.000Z" },
    ],
  };
}
