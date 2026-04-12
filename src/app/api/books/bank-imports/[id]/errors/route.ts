import { NextRequest } from "next/server";
import { getBankStatementImportDetail, type FailedBankStatementRow } from "@/lib/accounting";
import {
  BooksApiError,
  BooksApiErrorCode,
  booksApiResponse,
  handleBooksApiError,
  requireBooksApiRead,
} from "../../../_utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await requireBooksApiRead("bankReconciliation");
    const { id } = await context.params;

    const detail = await getBankStatementImportDetail(orgId, id);
    if (!detail) {
      throw new BooksApiError(BooksApiErrorCode.NOT_FOUND, "Bank statement import not found.", 404);
    }

    return booksApiResponse({
      importId: detail.id,
      fileName: detail.fileName,
      failedRows:
        Array.isArray(detail.errorRows)
          ? (detail.errorRows as unknown as FailedBankStatementRow[])
          : [],
    });
  } catch (error) {
    return handleBooksApiError(error);
  }
}
