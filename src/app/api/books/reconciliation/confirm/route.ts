import { NextRequest } from "next/server";
import { confirmBankTransactionMatch } from "@/lib/accounting";
import {
  BooksApiError,
  BooksApiErrorCode,
  booksApiResponse,
  handleBooksApiError,
  parseOptionalNumber,
  requireBooksApiWrite,
} from "../../_utils";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireBooksApiWrite("bankReconciliation");
    const body = (await request.json().catch(() => null)) as
      | { bankTransactionId?: string; matchId?: string; matchedAmount?: number | string }
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

    const match = await confirmBankTransactionMatch({
      orgId,
      actorId: userId,
      bankTransactionId,
      matchId,
      matchedAmount: parseOptionalNumber(body.matchedAmount, "matchedAmount"),
    });

    return booksApiResponse({ id: match.id });
  } catch (error) {
    return handleBooksApiError(error);
  }
}
