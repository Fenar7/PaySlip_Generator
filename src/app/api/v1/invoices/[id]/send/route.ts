import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { performIssueInvoice } from "@/app/app/docs/invoices/actions";
import { dispatchEvent } from "@/lib/webhook/deliver";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  getClientIp,
  ErrorCode,
  ApiError,
} from "../../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:invoices");
    const { id } = await context.params;

    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
    });

    if (!invoice) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    }

    if (invoice.status !== "DRAFT") {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Only DRAFT invoices can be sent.", 422);
    }

    // Reuse the authoritative issue lifecycle so the API path includes
    // all required side effects (state event, public token, accounting,
    // inventory, workflow, event emission, index sync).
    const { invoiceNumber } = await performIssueInvoice(
      auth.orgId,
      `api:${auth.apiKeyId}`,
      id,
    );

    dispatchEvent(auth.orgId, "invoice.sent", {
      id,
      invoiceNumber,
      status: "ISSUED",
    }).catch(() => {});

    const resp = apiResponse({
      id,
      invoiceNumber,
      status: "ISSUED",
      issuedAt: new Date(),
    });
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", `/api/v1/invoices/${id}/send`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
