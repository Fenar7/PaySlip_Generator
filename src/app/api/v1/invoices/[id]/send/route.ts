import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { nextDocumentNumberTx } from "@/lib/docs";
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

    const updated = await db.$transaction(async (tx) => {
      // Phase 4: drafts may have null invoiceNumber — assign one
      // before transitioning to ISSUED so no issued invoice is
      // left unnumbered.
      const invoiceNumber =
        invoice.invoiceNumber ??
        await nextDocumentNumberTx(tx, auth.orgId, "invoice");

      return tx.invoice.update({
        where: { id },
        data: {
          status: "ISSUED",
          issuedAt: new Date(),
          ...(invoiceNumber !== invoice.invoiceNumber
            ? { invoiceNumber }
            : {}),
        },
      });
    });

    dispatchEvent(auth.orgId, "invoice.sent", {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
    }).catch(() => {});

    const resp = apiResponse({
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
      issuedAt: updated.issuedAt,
    });
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", `/api/v1/invoices/${id}/send`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
