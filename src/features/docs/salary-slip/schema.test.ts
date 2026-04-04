import { salarySlipDefaultValues } from "@/features/docs/salary-slip/constants";
import {
  salarySlipDocumentSchema,
  salarySlipExportRequestSchema,
  salarySlipFormSchema,
} from "@/features/docs/salary-slip/schema";
import { normalizeSalarySlip } from "@/features/docs/salary-slip/utils/normalize-salary-slip";

describe("salary slip schema", () => {
  it("accepts the default salary slip form values", () => {
    expect(salarySlipFormSchema.safeParse(salarySlipDefaultValues).success).toBe(true);
  });

  it("rejects invalid attendance counts", () => {
    const result = salarySlipFormSchema.safeParse({
      ...salarySlipDefaultValues,
      paidDays: "40",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid month values", () => {
    const result = salarySlipFormSchema.safeParse({
      ...salarySlipDefaultValues,
      month: "Smarch",
    });

    expect(result.success).toBe(false);
  });

  it("accepts the normalized salary slip document payload", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);

    expect(salarySlipDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("accepts the salary slip export request payload", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);

    expect(
      salarySlipExportRequestSchema.safeParse({ document }).success,
    ).toBe(true);
  });
});
