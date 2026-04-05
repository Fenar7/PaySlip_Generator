import { notFound } from "next/navigation";
import { getInvoice, getInvoiceTimeline } from "../actions";
import { InvoiceBrandingWrapper } from "../new/branding-wrapper";
import { listCustomers } from "@/app/app/data/actions";
import { InvoiceDetailClient } from "./invoice-detail-client";

export const metadata = {
  title: "Edit Invoice | Slipwise",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, customersResult, events] = await Promise.all([
    getInvoice(id),
    listCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
    getInvoiceTimeline(id),
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
          />
        </div>
      </aside>
    </div>
  );
}
