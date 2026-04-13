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
  getReconciliationWorkspace: vi.fn(),
  confirmBankTransactionMatch: vi.fn(),
  ignoreBankTransaction: vi.fn(),
  rejectBankTransactionMatch: vi.fn(),
}));

import { getOrgContext, hasRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans";
import {
  getReconciliationWorkspace,
  confirmBankTransactionMatch,
  ignoreBankTransaction,
  rejectBankTransactionMatch,
} from "@/lib/accounting";
import { GET as getSuggestions } from "../suggestions/route";
import { POST as postConfirm } from "../confirm/route";
import { POST as postIgnore } from "../ignore/route";
import { POST as postReject } from "../reject/route";

const mockedGetOrgContext = vi.mocked(getOrgContext);
const mockedHasRole = vi.mocked(hasRole);
const mockedCheckFeature = vi.mocked(checkFeature);
const mockedGetReconciliationWorkspace = vi.mocked(getReconciliationWorkspace);
const mockedConfirmBankTransactionMatch = vi.mocked(confirmBankTransactionMatch);
const mockedIgnoreBankTransaction = vi.mocked(ignoreBankTransaction);
const mockedRejectBankTransactionMatch = vi.mocked(rejectBankTransactionMatch);

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url), init);
}

describe("Books reconciliation API routes", () => {
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

  it("loads the reconciliation workspace with parsed filters", async () => {
    mockedGetReconciliationWorkspace.mockResolvedValue({
      bankAccounts: [],
      transactions: [],
      importHistory: [],
      manualAccounts: [],
    } as never);

    const response = await getSuggestions(
      makeRequest(
        "http://localhost/api/books/reconciliation/suggestions?bankAccountId=bank-1&status=SUGGESTED&minAmount=100.5&maxAmount=300",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockedGetReconciliationWorkspace).toHaveBeenCalledWith("org-1", {
      bankAccountId: "bank-1",
      importId: undefined,
      status: "SUGGESTED",
      startDate: undefined,
      endDate: undefined,
      minAmount: 100.5,
      maxAmount: 300,
    });
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockedGetOrgContext.mockResolvedValue(null);

    const response = await getSuggestions(
      makeRequest("http://localhost/api/books/reconciliation/suggestions"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe("Unauthorized");
    expect(mockedGetReconciliationWorkspace).not.toHaveBeenCalled();
  });

  it("confirms a reconciliation suggestion for finance managers", async () => {
    mockedGetOrgContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "finance_manager",
    });
    mockedConfirmBankTransactionMatch.mockResolvedValue({
      id: "match-1",
    } as never);

    const response = await postConfirm(
      makeRequest("http://localhost/api/books/reconciliation/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankTransactionId: "txn-1",
          matchId: "match-1",
          matchedAmount: "125.75",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "match-1" });
    expect(mockedConfirmBankTransactionMatch).toHaveBeenCalledWith({
      orgId: "org-1",
      actorId: "user-1",
      bankTransactionId: "txn-1",
      matchId: "match-1",
      matchedAmount: 125.75,
    });
  });

  it("blocks ignore writes for members without admin access", async () => {
    mockedGetOrgContext.mockResolvedValue({
      userId: "user-2",
      orgId: "org-1",
      role: "member",
    });
    mockedHasRole.mockReturnValue(false);

    const response = await postIgnore(
      makeRequest("http://localhost/api/books/reconciliation/ignore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankTransactionId: "txn-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toBe("Insufficient permissions.");
    expect(mockedIgnoreBankTransaction).not.toHaveBeenCalled();
  });

  it("rejects a reconciliation suggestion", async () => {
    mockedRejectBankTransactionMatch.mockResolvedValue({
      id: "match-2",
    } as never);

    const response = await postReject(
      makeRequest("http://localhost/api/books/reconciliation/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankTransactionId: "txn-2",
          matchId: "match-2",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "match-2" });
    expect(mockedRejectBankTransactionMatch).toHaveBeenCalledWith({
      orgId: "org-1",
      actorId: "user-1",
      bankTransactionId: "txn-2",
      matchId: "match-2",
    });
  });
});
