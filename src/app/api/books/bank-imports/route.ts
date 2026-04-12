import crypto from "node:crypto";
import { NextRequest } from "next/server";
import {
  generateBankStatementStoragePath,
  importBankStatement,
} from "@/lib/accounting";
import { checkLimit } from "@/lib/plans";
import { isCsvUpload, isUploadedFile } from "@/lib/server/form-data";
import { uploadFileServer } from "@/lib/storage/upload-server";
import {
  BooksApiError,
  BooksApiErrorCode,
  booksApiResponse,
  handleBooksApiError,
  requireBooksApiWrite,
} from "../_utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireBooksApiWrite("bankReconciliation");
    const limitCheck = await checkLimit(orgId, "statementImportsPerMonth");

    if (!limitCheck.allowed) {
      throw new BooksApiError(
        BooksApiErrorCode.PLAN_LIMIT_REACHED,
        `Statement import limit reached for this month (${limitCheck.current}/${limitCheck.limit}).`,
        402,
      );
    }

    const formData = await request.formData();
    const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
    const mappingRaw = String(formData.get("mapping") ?? "").trim();
    const file = formData.get("file");

    if (!bankAccountId) {
      throw new BooksApiError(
        BooksApiErrorCode.VALIDATION_ERROR,
        "Bank account is required.",
        422,
      );
    }

    if (!isUploadedFile(file)) {
      throw new BooksApiError(
        BooksApiErrorCode.VALIDATION_ERROR,
        "CSV file is required.",
        422,
      );
    }

    if (!isCsvUpload(file)) {
      throw new BooksApiError(
        BooksApiErrorCode.VALIDATION_ERROR,
        "Only CSV bank statements are supported.",
        422,
      );
    }

    let mapping: unknown = {};
    try {
      mapping = JSON.parse(mappingRaw || "{}") as unknown;
    } catch {
      throw new BooksApiError(
        BooksApiErrorCode.VALIDATION_ERROR,
        "Invalid mapping JSON.",
        422,
      );
    }

    const csvText = await file.text();
    const checksum = crypto.createHash("sha256").update(csvText).digest("hex");
    const storagePath = generateBankStatementStoragePath(orgId, bankAccountId, file.name);
    const uploaded = await uploadFileServer(
      "attachments",
      storagePath,
      Buffer.from(csvText, "utf8"),
      file.type || "text/csv",
    );

    const result = await importBankStatement({
      orgId,
      actorId: userId,
      bankAccountId,
      fileName: file.name,
      storageKey: uploaded.storageKey,
      checksum,
      csvText,
      mapping,
    });

    return booksApiResponse(result, 201);
  } catch (error) {
    return handleBooksApiError(error);
  }
}
