import { render, screen } from "@testing-library/react";
import { salarySlipDefaultValues } from "@/features/salary-slip/constants";
import { CorporateCleanSalarySlipTemplate } from "@/features/salary-slip/templates/corporate-clean";
import { SalarySlipPreview } from "@/features/salary-slip/components/salary-slip-preview";
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";

describe("SalarySlipPreview", () => {
  it("renders the normalized salary slip preview", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);

    render(<SalarySlipPreview document={document} />);

    expect(screen.getByText("Arun Dev")).toBeInTheDocument();
    expect(screen.getByText(/monthly payroll summary/i)).toBeInTheDocument();
    expect(screen.getByText(/live preview/i)).toBeInTheDocument();
  });

  it("marks print sections to avoid mid-page splits", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);

    render(<CorporateCleanSalarySlipTemplate document={document} mode="pdf" />);

    expect(
      screen.getByText(/disbursement details/i).closest("section"),
    ).toHaveClass("document-break-inside-avoid");
    expect(
      screen.getByText(/employee acknowledgement/i).closest("section"),
    ).toHaveClass("document-break-inside-avoid");
  });
});
