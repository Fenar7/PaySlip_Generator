import type { Metadata } from "next";
import { InvoiceWorkspace } from "@/features/docs/invoice/components/invoice-workspace";

export const metadata: Metadata = {
  title: "Invoice Studio",
  description: "Create and export professional invoices.",
};

export default function NewInvoicePage() {
  return <InvoiceWorkspace />;
}
