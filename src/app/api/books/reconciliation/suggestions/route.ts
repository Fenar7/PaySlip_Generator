import { NextRequest } from "next/server";
import { getReconciliationWorkspace } from "@/lib/accounting";
import {
  booksApiResponse,
  handleBooksApiError,
  parseOptionalNumber,
  requireBooksApiRead,
} from "../../_utils";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireBooksApiRead("bankReconciliation");
    const searchParams = request.nextUrl.searchParams;

    const workspace = await getReconciliationWorkspace(orgId, {
      bankAccountId: searchParams.get("bankAccountId") ?? undefined,
      importId: searchParams.get("importId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      minAmount: parseOptionalNumber(searchParams.get("minAmount"), "minAmount"),
      maxAmount: parseOptionalNumber(searchParams.get("maxAmount"), "maxAmount"),
    });

    return booksApiResponse(workspace);
  } catch (error) {
    return handleBooksApiError(error);
  }
}
