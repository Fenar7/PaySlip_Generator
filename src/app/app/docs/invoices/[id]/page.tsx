import { notFound } from "next/navigation";
import { getInvoice, getInvoiceTimeline, getInvoicePayments } from "../actions";
import { InvoiceBrandingWrapper } from "../new/branding-wrapper";
import { listCustomers } from "@/app/app/data/actions";
import { InvoiceDetailClient } from "./invoice-detail-client";
import { DocumentAttachments } from "@/components/docs/document-attachments";
import { getDocAttachments } from "@/app/app/docs/attachment-actions";

export const metadata = {
  title: "Edit Invoice | Slipwise",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, customersResult, events, payments, attachments] = await Promise.all([
    getInvoice(id),
    listCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
    getInvoiceTimeline(id),
    getInvoicePayments(id),
    getDocAttachments(id, "invoice"),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <InvoiceBrandingWrapper
          existingInvoice={invoice}
          customers={customersResult.customers}
        />
      </div>
      <aside className="w-full shrink-0 lg:w-80">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <InvoiceDetailClient
            invoiceId={invoice.id}
            status={invoice.status}
            events={events}
            invoiceSummary={{
              totalAmount: invoice.totalAmount,
              amountPaid: invoice.amountPaid,
              remainingAmount: invoice.remainingAmount,
              lastPaymentAt: invoice.lastPaymentAt?.toISOString() ?? null,
              lastPaymentMethod: invoice.lastPaymentMethod,
              paymentPromiseDate: invoice.paymentPromiseDate ?? null,
              razorpayPaymentLinkUrl: invoice.razorpayPaymentLinkUrl,
              paymentLinkStatus: invoice.paymentLinkStatus,
              paymentLinkExpiresAt: invoice.paymentLinkExpiresAt?.toISOString() ?? null,
              paymentLinkLastEventAt: invoice.paymentLinkLastEventAt?.toISOString() ?? null,
            }}
            payments={payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              paidAt: p.paidAt.toISOString(),
              method: p.method,
              note: p.note,
              source: p.source,
              status: p.status,
              externalPaymentId: p.externalPaymentId,
              paymentMethodDisplay: p.paymentMethodDisplay,
              plannedNextPaymentDate: p.plannedNextPaymentDate,
            }))}
          />
        </div>
        <div className="mt-6">
          <DocumentAttachments docId={invoice.id} docType="invoice" attachments={attachments} />
        </div>
      </aside>
    </div>
  );
}
