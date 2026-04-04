import { salarySlipDefaultValues } from "@/features/docs/salary-slip/constants";
import { normalizeSalarySlip } from "@/features/docs/salary-slip/utils/normalize-salary-slip";
import { buildSalarySlipFilename } from "@/features/docs/salary-slip/utils/build-salary-slip-filename";

describe("buildSalarySlipFilename", () => {
  it("builds a stable export filename from employee and period", () => {
    const document = normalizeSalarySlip({
      ...salarySlipDefaultValues,
      employeeName: "Arun Dev",
      payPeriodLabel: "March 2026",
    });

    expect(buildSalarySlipFilename(document, "pdf")).toBe(
      "salary-slip-arun-dev-march-2026.pdf",
    );
    expect(buildSalarySlipFilename(document, "png")).toBe(
      "salary-slip-arun-dev-march-2026.png",
    );
  });
});
