import { render, screen } from "@testing-library/react";
import { salarySlipDefaultValues } from "@/features/salary-slip/constants";
import { SalarySlipPreview } from "@/features/salary-slip/components/salary-slip-preview";
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";

describe("SalarySlipPreview", () => {
  it("renders the normalized salary slip preview", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);

    render(<SalarySlipPreview document={document} />);

    expect(screen.getAllByText(/salary slip/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Arun Dev")).toBeInTheDocument();
    expect(screen.getByText(/corporate clean/i)).toBeInTheDocument();
  });
});
