import { salarySlipDefaultValues } from "@/features/salary-slip/constants";
import {
  createSalarySlipExportSession,
  getSalarySlipExportSession,
} from "@/features/salary-slip/server/export-session-store";
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";

describe("salary slip export session store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and resolves salary slip documents by token", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);
    const token = createSalarySlipExportSession(document);

    expect(getSalarySlipExportSession(token)).toEqual(document);
  });

  it("expires salary slip sessions after the ttl", () => {
    const document = normalizeSalarySlip(salarySlipDefaultValues);
    const token = createSalarySlipExportSession(document);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(getSalarySlipExportSession(token)).toBeNull();
  });
});
