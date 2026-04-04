import { notFound } from "next/navigation";
import { getInvoice } from "../actions";
import { InvoiceBrandingWrapper } from "../new/branding-wrapper";

export const metadata = {
  title: "Edit Invoice | Slipwise",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  // Pass the invoice data to the editor via props
  return <InvoiceBrandingWrapper existingInvoice={invoice} />;
}
