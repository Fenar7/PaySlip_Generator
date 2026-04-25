import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PdfStudioSupportNotice } from "./pdf-studio-support-notice";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PdfStudioSupportNotice", () => {
  it("shows generic workspace copy when no execution mode is provided", () => {
    render(<PdfStudioSupportNotice surface="workspace" />);

    expect(
      screen.getByText(/browser-first pdf studio tools run in this tab/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/worker-backed conversions add job IDs/i),
    ).toBeInTheDocument();
  });

  it("shows generic public copy when no execution mode is provided", () => {
    render(<PdfStudioSupportNotice surface="public" />);

    expect(
      screen.getByText(/public pdf studio pages use the suite support guide/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/worker-backed conversions still require the signed-in workspace/i),
    ).toBeInTheDocument();
  });

  it("shows browser-first copy that is honest about lacking worker diagnostics", () => {
    render(<PdfStudioSupportNotice surface="workspace" executionMode="browser" />);

    const copy = screen.getByText(/this tool runs locally in the browser/i);
    expect(copy).toBeInTheDocument();
    expect(copy.textContent).toMatch(/do not expose persistent job IDs/i);
    expect(copy.textContent).toMatch(/do not expose.*worker diagnostics/i);
  });

  it("shows worker-backed copy that mentions job IDs and diagnostics", () => {
    render(<PdfStudioSupportNotice surface="workspace" executionMode="processing" />);

    const copy = screen.getByText(/this tool runs as a tracked worker job/i);
    expect(copy).toBeInTheDocument();
    expect(copy.textContent).toMatch(/job ID/i);
    expect(copy.textContent).toMatch(/failure codes/i);
  });

  it("shows hybrid copy that distinguishes browser and worker recovery", () => {
    render(<PdfStudioSupportNotice surface="workspace" executionMode="hybrid" />);

    const copy = screen.getByText(/this tool uses a hybrid lane/i);
    expect(copy).toBeInTheDocument();
    expect(copy.textContent).toMatch(/browser failures/i);
    expect(copy.textContent).toMatch(/worker failures/i);
  });

  it("links to the suite support guide in all modes", () => {
    render(<PdfStudioSupportNotice surface="workspace" executionMode="browser" />);

    expect(screen.getByText("Suite support guide")).toHaveAttribute(
      "href",
      "/help/troubleshooting/pdf-studio-support",
    );
  });

  it("hides worker job guide for browser-only mode", () => {
    render(<PdfStudioSupportNotice surface="public" executionMode="browser" />);

    expect(screen.queryByText("Worker job guide")).not.toBeInTheDocument();
    expect(screen.getByText("Suite support guide")).toBeInTheDocument();
  });

  it("shows worker job guide for processing mode", () => {
    render(<PdfStudioSupportNotice surface="workspace" executionMode="processing" />);

    expect(screen.getByText("Worker job guide")).toHaveAttribute(
      "href",
      "/help/troubleshooting/pdf-studio-jobs",
    );
  });

  it("shows worker job guide for hybrid mode", () => {
    render(<PdfStudioSupportNotice surface="public" executionMode="hybrid" />);

    expect(screen.getByText("Worker job guide")).toBeInTheDocument();
  });

  it("shows worker job guide for unknown/fallback mode", () => {
    render(<PdfStudioSupportNotice surface="workspace" />);

    expect(screen.getByText("Worker job guide")).toBeInTheDocument();
  });

  it("shows browser recovery hint when failureReason is provided for browser mode", () => {
    render(
      <PdfStudioSupportNotice
        surface="workspace"
        executionMode="browser"
        failureReason="pdf-read-failed"
      />,
    );

    expect(
      screen.getByText(/check that the file is a valid PDF/i),
    ).toBeInTheDocument();
  });

  it("does not show recovery hint when failureReason is missing", () => {
    render(<PdfStudioSupportNotice surface="workspace" executionMode="browser" />);

    expect(
      screen.queryByText(/check that the file is a valid PDF/i),
    ).not.toBeInTheDocument();
  });

  it("does not show recovery hint for processing mode even with failureReason", () => {
    render(
      <PdfStudioSupportNotice
        surface="workspace"
        executionMode="processing"
        failureReason="pdf-read-failed"
      />,
    );

    expect(
      screen.queryByText(/check that the file is a valid PDF/i),
    ).not.toBeInTheDocument();
  });
});
