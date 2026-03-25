import { WorkspaceShell } from "@/components/foundation/workspace-shell";

export default function SalarySlipPage() {
  return (
    <WorkspaceShell
      eyebrow="Salary slip workspace"
      title="Salary Slip Generator"
      description="This shell sets the stage for a calm, premium payslip workflow with employee details, salary-period controls, repeatable earnings and deductions, and a trustworthy preview canvas."
      configurationSections={[
        "Template and branding",
        "Employee details",
        "Salary period",
        "Earnings and deductions",
      ]}
      previewSummary="The final preview will support structured payslip hierarchy, net salary summaries, optional employee blocks, and a polished balance between clarity and professionalism."
    />
  );
}
