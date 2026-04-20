import type { Metadata } from "next";
import { InvoiceBrandingWrapper } from "./branding-wrapper";
import { listCustomers } from "@/app/app/data/actions";
import { getOrgDefaults } from "@/app/app/actions/org-defaults-actions";
import { listInventoryItems } from "@/app/app/inventory/items/actions";

export const metadata: Metadata = {
  title: "Invoice Studio",
  description: "Create and export professional invoices.",
};

interface PageProps {
  searchParams: Promise<{ template?: string }>;
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [customersResult, inventoryResult, defaults] = await Promise.all([
    listCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
    listInventoryItems({ pageSize: 100 }).catch(() => ({ success: false as const, error: "Inventory unavailable" })),
    getOrgDefaults().catch(() => null),
  ]);
  const templateId = params.template || defaults?.defaultInvoiceTemplate || undefined;
  return (
    <InvoiceBrandingWrapper
      initialTemplateId={templateId}
      customers={customersResult.customers}
      inventoryItems={inventoryResult.success ? inventoryResult.data.items : []}
    />
  );
}
