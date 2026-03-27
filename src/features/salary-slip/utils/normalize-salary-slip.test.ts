import { salarySlipDefaultValues } from "@/features/salary-slip/constants";
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";

describe("normalizeSalarySlip", () => {
  it("computes salary totals and net salary words", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);

    expect(document.title).toBe("Salary Slip");
    expect(document.totalEarnings).toBe(47500);
    expect(document.totalDeductions).toBe(2000);
    expect(document.netSalary).toBe(45500);
    expect(document.netSalaryInWords).toBe("Forty-five thousand five hundred only");
  });

  it("prunes hidden optional sections from the normalized payload", () => {
    const document = normalizeSalarySlip({
      ...salarySlipDefaultValues,
      visibility: {
        ...salarySlipDefaultValues.visibility,
        showNotes: false,
        showBankDetails: false,
      },
    });

    expect(document.notes).toBeUndefined();
    expect(document.bankName).toBeUndefined();
    expect(document.bankAccountNumber).toBeUndefined();
  });
});
