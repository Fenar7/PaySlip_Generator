import { NextRequest } from "next/server";
import { ignoreBankTransaction } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";
import {
  BooksApiError,
  BooksApiErrorCode,
  booksApiResponse,
  handleBooksApiError,
  requireBooksApiWrite,
} from "../../_utils";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireBooksApiWrite("bankReconciliation");
    const body = (await request.json().catch(() => null)) as
      | { bankTransactionId?: string }
      | null;

    if (!body) {
      throw new BooksApiError(BooksApiErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const bankTransactionId = String(body.bankTransactionId ?? "").trim();
    if (!bankTransactionId) {
      throw new BooksApiError(
        BooksApiErrorCode.VALIDATION_ERROR,
        "bankTransactionId is required.",
        422,
      );
    }

    await ignoreBankTransaction({
      orgId,
      actorId: userId,
      bankTransactionId,
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "books.reconciliation_ignored",
      entityType: "BankTransaction",
      entityId: bankTransactionId,
    });

    return booksApiResponse({ id: bankTransactionId });
  } catch (error) {
    return handleBooksApiError(error);
  }
}
