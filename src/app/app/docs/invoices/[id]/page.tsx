import { notFound } from "next/navigation";
import { getInvoice } from "../actions";
import { InvoiceBrandingWrapper } from "../new/branding-wrapper";
import { listCustomers } from "@/app/app/data/actions";

export const metadata = {
  title: "Edit Invoice | Slipwise",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, customersResult] = await Promise.all([
    getInvoice(id),
    listCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
  ]);

  if (!invoice) {
    notFound();
  }

  return <InvoiceBrandingWrapper existingInvoice={invoice} customers={customersResult.customers} />;
}
