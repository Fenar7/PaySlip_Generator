import type { Metadata } from "next";
import { InvoiceBrandingWrapper } from "./branding-wrapper";

export const metadata: Metadata = {
  title: "Invoice Studio",
  description: "Create and export professional invoices.",
};

export default function NewInvoicePage() {
  return <InvoiceBrandingWrapper />;
}
