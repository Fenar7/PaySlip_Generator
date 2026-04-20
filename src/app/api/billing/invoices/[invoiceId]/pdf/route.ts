import { NextRequest, NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderBillingInvoicePdf } from "@/lib/billing/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { orgId } = await requireOrgContext();
  const { invoiceId } = await params;

  const invoice = await db.billingInvoice.findFirst({
    where: { id: invoiceId, orgId },
    select: {
      id: true,
      orgId: true,
      createdAt: true,
      planId: true,
      amountPaise: true,
      currency: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const billingAccount = await db.billingAccount.findUnique({
    where: { orgId },
    select: {
      billingCountry: true,
      billingEmail: true,
    },
  });

  const pdfBytes = await renderBillingInvoicePdf({
    ...invoice,
    organization: invoice.organization,
    billingAccount,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="billing-invoice-${invoice.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
