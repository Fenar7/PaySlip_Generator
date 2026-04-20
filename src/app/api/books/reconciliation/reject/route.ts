import { NextRequest } from "next/server";
import { rejectBankTransactionMatch } from "@/lib/accounting";
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
      | { bankTransactionId?: string; matchId?: string }
      | null;

    if (!body) {
      throw new BooksApiError(BooksApiErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const bankTransactionId = String(body.bankTransactionId ?? "").trim();
    const matchId = String(body.matchId ?? "").trim();

    if (!bankTransactionId || !matchId) {
      throw new BooksApiError(
        BooksApiErrorCode.VALIDATION_ERROR,
        "bankTransactionId and matchId are required.",
        422,
      );
    }

    const match = await rejectBankTransactionMatch({
      orgId,
      actorId: userId,
      bankTransactionId,
      matchId,
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "books.reconciliation_rejected",
      entityType: "BankTransaction",
      entityId: bankTransactionId,
      metadata: { matchId },
    });

    return booksApiResponse({ id: match.id });
  } catch (error) {
    return handleBooksApiError(error);
  }
}
