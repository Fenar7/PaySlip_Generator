import { notFound } from "next/navigation";
import { getInvoice, getInvoiceTimeline, getInvoicePayments } from "../actions";
import { InvoiceBrandingWrapper } from "../new/branding-wrapper";
import { listCustomers } from "@/app/app/data/actions";
import { InvoiceDetailClient } from "./invoice-detail-client";
import { DocumentAttachments } from "@/components/docs/document-attachments";
import { getDocAttachments } from "@/app/app/docs/attachment-actions";
import { listInventoryItems } from "@/app/app/inventory/items/actions";
import { DetailLayout, DetailRailCard } from "@/components/layout/detail-layout";

export const metadata = {
  title: "Edit Invoice | Slipwise",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, customersResult, inventoryResult, events, payments, attachments] = await Promise.all([
    getInvoice(id),
    listCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
    listInventoryItems({ pageSize: 100 }).catch(() => ({ success: false as const, error: "Inventory unavailable" })),
    getInvoiceTimeline(id),
    getInvoicePayments(id),
    getDocAttachments(id, "invoice"),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <DetailLayout
      rail={
        <>
          <DetailRailCard>
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
          </DetailRailCard>
          <DocumentAttachments docId={invoice.id} docType="invoice" attachments={attachments} />
        </>
      }
    >
      <InvoiceBrandingWrapper
        existingInvoice={invoice}
        customers={customersResult.customers}
        inventoryItems={inventoryResult.success ? inventoryResult.data.items : []}
      />
    </DetailLayout>
  );
}
