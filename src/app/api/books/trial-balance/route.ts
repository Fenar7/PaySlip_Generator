import { NextRequest } from "next/server";
import { getTrialBalance } from "@/lib/accounting";
import {
  booksApiResponse,
  handleBooksApiError,
  parseOptionalBoolean,
  requireBooksApiRead,
} from "../_utils";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireBooksApiRead();
    const searchParams = request.nextUrl.searchParams;

    const trialBalance = await getTrialBalance(orgId, {
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      includeInactive: parseOptionalBoolean(
        searchParams.get("includeInactive"),
        "includeInactive",
      ),
    });

    return booksApiResponse(trialBalance);
  } catch (error) {
    return handleBooksApiError(error);
  }
}
