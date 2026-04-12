import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
  hasRole: vi.fn(),
}));

vi.mock("@/lib/plans", () => ({
  checkFeature: vi.fn(),
  checkLimit: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  generateBankStatementStoragePath: vi.fn(),
  importBankStatement: vi.fn(),
  getBankStatementImportDetail: vi.fn(),
}));

vi.mock("@/lib/storage/upload-server", () => ({
  uploadFileServer: vi.fn(),
}));

import { getOrgContext, hasRole } from "@/lib/auth";
import { checkFeature, checkLimit } from "@/lib/plans";
import {
  generateBankStatementStoragePath,
  importBankStatement,
  getBankStatementImportDetail,
} from "@/lib/accounting";
import { uploadFileServer } from "@/lib/storage/upload-server";
import { POST as postImport } from "../route";
import { GET as getImportErrors } from "../[id]/errors/route";

const mockedGetOrgContext = vi.mocked(getOrgContext);
const mockedHasRole = vi.mocked(hasRole);
const mockedCheckFeature = vi.mocked(checkFeature);
const mockedCheckLimit = vi.mocked(checkLimit);
const mockedGenerateBankStatementStoragePath = vi.mocked(generateBankStatementStoragePath);
const mockedImportBankStatement = vi.mocked(importBankStatement);
const mockedGetBankStatementImportDetail = vi.mocked(getBankStatementImportDetail);
const mockedUploadFileServer = vi.mocked(uploadFileServer);

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url), init);
}

function makeFormRequest(url: string, formData: FormData): NextRequest {
  return new Request(url, {
    method: "POST",
    body: formData,
  }) as unknown as NextRequest;
}

describe("Books bank import API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetOrgContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "admin",
    });
    mockedHasRole.mockImplementation((role, requiredRole) => role === "owner" || role === requiredRole);
    mockedCheckFeature.mockResolvedValue(true);
    mockedCheckLimit.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 50,
    } as never);
    mockedGenerateBankStatementStoragePath.mockReturnValue("org-1/bank-1/statement.csv");
    mockedUploadFileServer.mockResolvedValue({
      storageKey: "attachments/org-1/bank-1/statement.csv",
    } as never);
  });

  it("uploads and imports a CSV bank statement", async () => {
    mockedImportBankStatement.mockResolvedValue({
      importId: "imp-1",
      importedRows: 1,
      failedRows: [],
      transactionCount: 1,
    } as never);

    const formData = new FormData();
    formData.set("bankAccountId", "bank-1");
    formData.set(
      "mapping",
      JSON.stringify({
        dateColumn: "Date",
        descriptionColumn: "Description",
        amountColumn: "Amount",
      }),
    );
    formData.append(
      "file",
      new Blob(["Date,Description,Amount\n2026-04-01,Deposit,1000"], {
        type: "text/csv",
      }),
      "statement.csv",
    );

    const response = await postImport(
      makeFormRequest("http://localhost/api/books/bank-imports", formData),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual({
      importId: "imp-1",
      importedRows: 1,
      failedRows: [],
      transactionCount: 1,
    });
    expect(mockedUploadFileServer).toHaveBeenCalled();
    expect(mockedImportBankStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        actorId: "user-1",
        bankAccountId: "bank-1",
        storageKey: "attachments/org-1/bank-1/statement.csv",
      }),
    );
  });

  it("returns 422 when mapping JSON is invalid", async () => {
    const formData = new FormData();
    formData.set("bankAccountId", "bank-1");
    formData.set("mapping", "{invalid");
    formData.append(
      "file",
      new Blob(["Date,Description,Amount\n2026-04-01,Deposit,1000"], {
        type: "text/csv",
      }),
      "statement.csv",
    );

    const response = await postImport(
      makeFormRequest("http://localhost/api/books/bank-imports", formData),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.message).toBe("Invalid mapping JSON.");
    expect(mockedImportBankStatement).not.toHaveBeenCalled();
  });

  it("returns stored failed rows for an import", async () => {
    mockedGetBankStatementImportDetail.mockResolvedValue({
      id: "imp-1",
      fileName: "statement.csv",
      errorRows: [
        {
          rowNumber: 3,
          error: "Duplicate transaction already exists for this bank account.",
          raw: { rowNumber: 3, Description: "Deposit" },
        },
      ],
    } as never);

    const response = await getImportErrors(
      makeRequest("http://localhost/api/books/bank-imports/imp-1/errors"),
      { params: Promise.resolve({ id: "imp-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.failedRows).toHaveLength(1);
    expect(body.data.failedRows[0].rowNumber).toBe(3);
  });

  it("returns 404 when the import is missing", async () => {
    mockedGetBankStatementImportDetail.mockResolvedValue(null);

    const response = await getImportErrors(
      makeRequest("http://localhost/api/books/bank-imports/missing/errors"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("Bank statement import not found.");
  });
});
