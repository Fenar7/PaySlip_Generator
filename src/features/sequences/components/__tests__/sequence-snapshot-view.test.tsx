import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SequenceSnapshotView } from "../sequence-snapshot-view";
import type { SequenceSnapshotEntry } from "../../services/sequence-history";

const baseSnapshot: SequenceSnapshotEntry = {
  id: "snap-1",
  version: 1,
  name: "Invoice Sequence",
  documentType: "INVOICE",
  periodicity: "YEARLY",
  isActive: true,
  formatString: "INV/{YYYY}/{NNNNN}",
  startCounter: 1,
  counterPadding: 5,
  totalConsumed: 42,
  periodsSnapshot: [
    {
      periodId: "per-1",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      currentCounter: 10,
      status: "OPEN",
    },
  ],
  changeType: "CREATED",
  changeSummary: "Initial configuration",
  changeNote: null,
  createdAt: "2026-01-10T10:00:00.000Z",
  changedBy: { id: "user-1", name: "Admin User" },
};

describe("SequenceSnapshotView", () => {
  it("renders version number and change type", () => {
    render(<SequenceSnapshotView snapshot={baseSnapshot} current={null} />);

    expect(screen.getByText("Version 1")).toBeDefined();
    expect(screen.getByText("Created")).toBeDefined();
  });

  it("renders config details", () => {
    render(<SequenceSnapshotView snapshot={baseSnapshot} current={null} />);

    expect(screen.getByText("Invoice Sequence")).toBeDefined();
    expect(screen.getByText("YEARLY")).toBeDefined();
    expect(screen.getByText("INV/{YYYY}/{NNNNN}")).toBeDefined();
  });

  it("renders period table when periods exist", () => {
    render(<SequenceSnapshotView snapshot={baseSnapshot} current={null} />);

    expect(screen.getByText("OPEN")).toBeDefined();
    expect(screen.getByText("2026-01-01")).toBeDefined();
    expect(screen.getByText("2026-12-31")).toBeDefined();
  });

  it("does not render period table when no periods", () => {
    const snapshot = { ...baseSnapshot, periodsSnapshot: [] };
    render(<SequenceSnapshotView snapshot={snapshot} current={null} />);

    expect(screen.queryByText("Period Windows")).toBeNull();
  });

  it("renders change summary when present", () => {
    render(<SequenceSnapshotView snapshot={baseSnapshot} current={null} />);

    expect(screen.getByText("Initial configuration")).toBeDefined();
  });

  it("shows inactive badge when isActive is false", () => {
    const snapshot = { ...baseSnapshot, isActive: false };
    render(<SequenceSnapshotView snapshot={snapshot} current={null} />);

    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("renders changed by name", () => {
    render(<SequenceSnapshotView snapshot={baseSnapshot} current={null} />);

    expect(screen.getByText(/Admin User/)).toBeDefined();
  });

  it("does not highlight fields when no current state for comparison", () => {
    render(<SequenceSnapshotView snapshot={baseSnapshot} current={null} />);

    // No amber-highlighted items should exist when current is null
    const highlighted = document.querySelectorAll(".bg-amber-50");
    expect(highlighted.length).toBe(0);
  });

  it("highlights fields that differ from current state", () => {
    const current = {
      name: "Invoice Sequence",
      periodicity: "MONTHLY",
      isActive: true,
      formatString: "INV-{YYYY}-{MM}-{NNNNN}",
      startCounter: 100,
      counterPadding: 4,
      totalConsumed: 50,
    };

    render(<SequenceSnapshotView snapshot={baseSnapshot} current={current} />);

    // At least some amber-highlighted items should exist
    const highlighted = document.querySelectorAll(".bg-amber-50");
    expect(highlighted.length).toBeGreaterThan(0);
  });

  it("does not highlight identical fields", () => {
    const current = {
      name: "Invoice Sequence",
      periodicity: "YEARLY",
      isActive: true,
      formatString: "INV/{YYYY}/{NNNNN}",
      startCounter: 1,
      counterPadding: 5,
      totalConsumed: 42,
    };

    render(<SequenceSnapshotView snapshot={baseSnapshot} current={current} />);

    const highlighted = document.querySelectorAll(".bg-amber-50");
    expect(highlighted.length).toBe(0);
  });
});
