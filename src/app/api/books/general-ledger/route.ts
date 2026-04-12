import { NextRequest } from "next/server";
import { getGeneralLedger } from "@/lib/accounting";
import {
  booksApiResponse,
  handleBooksApiError,
  requireBooksApiRead,
} from "../_utils";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireBooksApiRead();
    const searchParams = request.nextUrl.searchParams;

    const ledger = await getGeneralLedger(orgId, {
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      accountId: searchParams.get("accountId") ?? undefined,
    });

    return booksApiResponse(ledger);
  } catch (error) {
    return handleBooksApiError(error);
  }
}
