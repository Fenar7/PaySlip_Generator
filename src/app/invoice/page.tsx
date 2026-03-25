import { WorkspaceShell } from "@/components/foundation/workspace-shell";

export default function InvoicePage() {
  return (
    <WorkspaceShell
      eyebrow="Invoice workspace"
      title="Invoice Generator"
      description="This workspace is ready for client-facing invoices with line items, tax-aware summaries, and a document surface designed to feel branded without drifting into accounting-software clutter."
      configurationSections={[
        "Template and branding",
        "Business and client details",
        "Invoice metadata",
        "Line items and totals",
      ]}
      previewSummary="The final invoice canvas will handle structured tables, tax and discount summaries, and flexible footer blocks while preserving A4 stability for export."
    />
  );
}
