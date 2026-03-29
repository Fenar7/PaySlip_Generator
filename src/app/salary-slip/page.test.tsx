import { render, screen } from "@testing-library/react";
import SalarySlipPage from "@/app/salary-slip/page";

describe("SalarySlipPage", () => {
  it("renders the salary slip workspace", () => {
    render(<SalarySlipPage />);

    expect(
      screen.getByRole("heading", { name: "Salary Slip Generator", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /build the payroll document/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /template and branding/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /employee details/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /pay period and attendance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /earnings and deductions/i }),
    ).toBeInTheDocument();
  });
});
