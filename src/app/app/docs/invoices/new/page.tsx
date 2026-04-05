import type { Metadata } from "next";
import { InvoiceBrandingWrapper } from "./branding-wrapper";

export const metadata: Metadata = {
  title: "Invoice Studio",
  description: "Create and export professional invoices.",
};

interface PageProps {
  searchParams: Promise<{ template?: string }>;
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <InvoiceBrandingWrapper initialTemplateId={params.template} />;
}
