import { describe, expect, it } from "vitest";
import { calculatePeriodBoundaries, isDateInPeriod } from "../periodicity";

describe("calculatePeriodBoundaries", () => {
  it("NONE returns eternal period", () => {
    const result = calculatePeriodBoundaries(new Date("2026-04-28"), "NONE");
    expect(result.startDate).toEqual(new Date(Date.UTC(1970, 0, 1)));
    expect(result.endDate).toEqual(new Date(Date.UTC(2999, 11, 31)));
  });

  it("MONTHLY returns correct month boundaries", () => {
    const result = calculatePeriodBoundaries(new Date("2026-04-28"), "MONTHLY");
    expect(result.startDate).toEqual(new Date(Date.UTC(2026, 3, 1)));
    expect(result.endDate).toEqual(new Date(Date.UTC(2026, 3, 30)));
  });

  it("MONTHLY handles February in leap year", () => {
    const result = calculatePeriodBoundaries(new Date("2024-02-15"), "MONTHLY");
    expect(result.startDate).toEqual(new Date(Date.UTC(2024, 1, 1)));
    expect(result.endDate).toEqual(new Date(Date.UTC(2024, 1, 29)));
  });

  it("YEARLY returns correct year boundaries", () => {
    const result = calculatePeriodBoundaries(new Date("2026-04-28"), "YEARLY");
    expect(result.startDate).toEqual(new Date(Date.UTC(2026, 0, 1)));
    expect(result.endDate).toEqual(new Date(Date.UTC(2026, 11, 31)));
  });

  it("FINANCIAL_YEAR with April start", () => {
    const result = calculatePeriodBoundaries(
      new Date("2026-04-28"),
      "FINANCIAL_YEAR",
      4
    );
    expect(result.startDate).toEqual(new Date(Date.UTC(2026, 3, 1)));
    expect(result.endDate).toEqual(new Date(Date.UTC(2027, 2, 31)));
  });

  it("FINANCIAL_YEAR with April start in January", () => {
    const result = calculatePeriodBoundaries(
      new Date("2026-01-15"),
      "FINANCIAL_YEAR",
      4
    );
    expect(result.startDate).toEqual(new Date(Date.UTC(2025, 3, 1)));
    expect(result.endDate).toEqual(new Date(Date.UTC(2026, 2, 31)));
  });
});

describe("isDateInPeriod", () => {
  it("returns true for date inside period", () => {
    const result = isDateInPeriod(
      new Date("2026-04-28"),
      new Date("2026-04-01"),
      new Date("2026-04-30")
    );
    expect(result).toBe(true);
  });

  it("returns false for date outside period", () => {
    const result = isDateInPeriod(
      new Date("2026-05-01"),
      new Date("2026-04-01"),
      new Date("2026-04-30")
    );
    expect(result).toBe(false);
  });
});
