import { WorkspaceShell } from "@/components/foundation/workspace-shell";

export default function VoucherPage() {
  return (
    <WorkspaceShell
      eyebrow="Voucher workspace"
      title="Voucher Generator"
      description="This workspace is prepared for payment and receipt voucher flows, with room for brand identity, structured details, and a document preview that already matches the final product direction."
      configurationSections={[
        "Template selection",
        "Branding and identity",
        "Voucher details",
        "Signatures and approvals",
      ]}
      previewSummary="The final voucher preview will render a precise A4 layout with title shifts for payment and receipt modes, optional notes/signatures, and export-safe spacing."
    />
  );
}
