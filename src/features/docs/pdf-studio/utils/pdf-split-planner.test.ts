import { describe, expect, it } from "vitest";
import {
  planSplitByBookmarks,
  planSplitByDetectedSeparators,
  planSplitBySelectedStarts,
  planSplitByTargetSize,
  planSplitEveryN,
  planSplitInHalf,
} from "@/features/docs/pdf-studio/utils/pdf-split-planner";

describe("pdf split planner", () => {
  it("builds deterministic every-n segments", () => {
    const plan = planSplitEveryN(10, 3);

    expect(plan.segments.map((segment) => [segment.startPage, segment.endPage])).toEqual([
      [1, 3],
      [4, 6],
      [7, 9],
      [10, 10],
    ]);
  });

  it("uses selected pages as explicit segment starts", () => {
    const plan = planSplitBySelectedStarts(9, [4, 7]);

    expect(plan.segments.map((segment) => [segment.startPage, segment.endPage])).toEqual([
      [1, 3],
      [4, 6],
      [7, 9],
    ]);
  });

  it("splits odd page counts into a larger first half", () => {
    const plan = planSplitInHalf(5);

    expect(plan.segments.map((segment) => segment.label)).toEqual([
      "First half",
      "Second half",
    ]);
    expect(plan.segments.map((segment) => [segment.startPage, segment.endPage])).toEqual([
      [1, 3],
      [4, 5],
    ]);
  });

  it("returns a fallback warning when bookmark analysis finds nothing", () => {
    const plan = planSplitByBookmarks(12, []);

    expect(plan.segments).toEqual([]);
    expect(plan.warning).toContain("No bookmark boundaries");
  });

  it("builds heuristic target-size groups", () => {
    const plan = planSplitByTargetSize({
      totalPages: 5,
      targetBytes: 200,
      estimatedPageBytes: [90, 90, 90, 90, 90],
    });

    expect(plan.heuristic).toBe(true);
    expect(plan.segments.map((segment) => [segment.startPage, segment.endPage])).toEqual([
      [1, 2],
      [3, 4],
      [5, 5],
    ]);
  });

  it("uses detected separators as heuristic split starts", () => {
    const plan = planSplitByDetectedSeparators(8, [
      {
        pageNumber: 3,
        heading: "Invoice 1002",
        reason: 'Detected "invoice" in the opening text.',
      },
      {
        pageNumber: 6,
        heading: "Invoice 1003",
        reason: 'Detected "invoice" in the opening text.',
      },
    ]);

    expect(plan.heuristic).toBe(true);
    expect(plan.segments.map((segment) => [segment.startPage, segment.endPage])).toEqual([
      [1, 2],
      [3, 5],
      [6, 8],
    ]);
  });
});
