import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
  hasRole: vi.fn(),
}));

vi.mock("@/lib/plans", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  getTrialBalance: vi.fn(),
  getGeneralLedger: vi.fn(),
  exportReconciliationCsv: vi.fn(),
  listJournalEntries: vi.fn(),
}));

import { getOrgContext, hasRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans";
import {
  getTrialBalance,
  getGeneralLedger,
  exportReconciliationCsv,
  listJournalEntries,
} from "@/lib/accounting";
import { GET as getTrialBalanceRoute } from "../trial-balance/route";
import { GET as getGeneralLedgerRoute } from "../general-ledger/route";
import { POST as postExportRoute } from "../reports/export/route";

const mockedGetOrgContext = vi.mocked(getOrgContext);
const mockedHasRole = vi.mocked(hasRole);
const mockedCheckFeature = vi.mocked(checkFeature);
const mockedGetTrialBalance = vi.mocked(getTrialBalance);
const mockedGetGeneralLedger = vi.mocked(getGeneralLedger);
const mockedExportReconciliationCsv = vi.mocked(exportReconciliationCsv);
const mockedListJournalEntries = vi.mocked(listJournalEntries);

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url), init);
}

describe("Books reporting API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetOrgContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "admin",
    });
    mockedHasRole.mockImplementation((role, requiredRole) => role === "owner" || role === requiredRole);
    mockedCheckFeature.mockResolvedValue(true);
  });

  it("loads trial balance data with includeInactive parsing", async () => {
    mockedGetTrialBalance.mockResolvedValue({
      rows: [],
      totals: { debit: 0, credit: 0 },
      balanced: true,
    } as never);

    const response = await getTrialBalanceRoute(
      makeRequest("http://localhost/api/books/trial-balance?includeInactive=true&startDate=2026-04-01"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockedGetTrialBalance).toHaveBeenCalledWith("org-1", {
      startDate: "2026-04-01",
      endDate: undefined,
      includeInactive: true,
    });
  });

  it("loads general ledger data for a selected account", async () => {
    mockedGetGeneralLedger.mockResolvedValue([] as never);

    const response = await getGeneralLedgerRoute(
      makeRequest("http://localhost/api/books/general-ledger?accountId=acct-1&endDate=2026-04-30"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockedGetGeneralLedger).toHaveBeenCalledWith("org-1", {
      startDate: undefined,
      endDate: "2026-04-30",
      accountId: "acct-1",
    });
  });

  it("exports reconciliation CSV downloads", async () => {
    mockedExportReconciliationCsv.mockResolvedValue("header\nrow" as never);

    const response = await postExportRoute(
      makeRequest("http://localhost/api/books/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "reconciliation",
          filters: {
            bankAccountId: "bank-1",
            minAmount: "25",
          },
        }),
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("books_reconciliation.csv");
    expect(body).toContain("header");
    expect(mockedExportReconciliationCsv).toHaveBeenCalledWith("org-1", {
      bankAccountId: "bank-1",
      importId: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
      minAmount: 25,
      maxAmount: undefined,
    });
  });

  it("exports reconciliation PDF downloads", async () => {
    mockedExportReconciliationCsv.mockResolvedValue("Column\nValue" as never);

    const response = await postExportRoute(
      makeRequest("http://localhost/api/books/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "reconciliation",
          format: "pdf",
        }),
      }),
    );
    const body = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("books_reconciliation.pdf");
    expect(body.byteLength).toBeGreaterThan(0);
  });

  it("exports journal register CSV downloads", async () => {
    mockedListJournalEntries.mockResolvedValue([
      {
        entryNumber: "JRN-1",
        entryDate: new Date("2026-04-01T00:00:00.000Z"),
        source: "INVOICE",
        sourceRef: "INV-1",
        status: "POSTED",
        memo: "Invoice posted",
        totalDebit: 100,
        totalCredit: 100,
        fiscalPeriod: { label: "2026-04" },
        lines: [{ id: "line-1" }],
      },
    ] as never);

    const response = await postExportRoute(
      makeRequest("http://localhost/api/books/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "journal_register",
          filters: {
            source: "INVOICE",
          },
        }),
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("books_journal_register.csv");
    expect(body).toContain('"JRN-1","2026-04-01","INVOICE","INV-1","POSTED","Invoice posted","2026-04","100.00","100.00","1"');
  });
});
