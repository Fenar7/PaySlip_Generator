import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PdfStudioPublicToolShell } from "./pdf-studio-public-tool-shell";
import {
  getPdfStudioTool,
  isPdfStudioToolInteractiveForPublic,
  listPdfStudioTools,
} from "@/features/docs/pdf-studio/lib/tool-registry";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-studio-capability-matrix", () => ({
  PdfStudioCapabilityMatrix: () => <div data-testid="capability-matrix" />,
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-studio-support-notice", () => ({
  PdfStudioSupportNotice: () => <div data-testid="support-notice" />,
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-studio-upgrade-notice", () => ({
  PdfStudioUpgradeNotice: ({ title }: { title: string }) => (
    <div data-testid="upgrade-notice">{title}</div>
  ),
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackUpgradeIntent: vi.fn(),
  }),
}));

describe("PdfStudioPublicToolShell", () => {
  it("renders an upgrade notice for every non-interactive public tool", () => {
    const nonInteractiveTools = listPdfStudioTools().filter(
      (t) => !isPdfStudioToolInteractiveForPublic(t),
    );

    expect(nonInteractiveTools.length).toBeGreaterThan(0);

    for (const tool of nonInteractiveTools) {
      const { unmount } = render(
        <PdfStudioPublicToolShell tool={tool}>
          <div data-testid="workspace">workspace</div>
        </PdfStudioPublicToolShell>,
      );

      expect(
        screen.getByTestId("upgrade-notice"),
        `${tool.id} should show upgrade notice on public surface`,
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("workspace"),
        `${tool.id} should not render workspace on public surface when non-interactive`,
      ).not.toBeInTheDocument();

      unmount();
    }
  });

  it("renders the workspace component for every interactive public tool", () => {
    const interactiveTools = listPdfStudioTools().filter((t) =>
      isPdfStudioToolInteractiveForPublic(t),
    );

    expect(interactiveTools.length).toBeGreaterThan(0);

    for (const tool of interactiveTools) {
      const { unmount } = render(
        <PdfStudioPublicToolShell tool={tool}>
          <div data-testid="workspace">workspace</div>
        </PdfStudioPublicToolShell>,
      );

      expect(
        screen.queryByTestId("upgrade-notice"),
        `${tool.id} should not show upgrade notice when interactive`,
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("workspace"),
        `${tool.id} should render workspace on public surface when interactive`,
      ).toBeInTheDocument();

      unmount();
    }
  });

  it("never renders a 'Soon' or placeholder state for any live tool", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const { container, unmount } = render(
        <PdfStudioPublicToolShell tool={tool}>
          <div>children</div>
        </PdfStudioPublicToolShell>,
      );

      const text = container.textContent ?? "";
      const lowerText = text.toLowerCase();

      // Reject explicit "Soon" product states
      expect(
        lowerText.includes("coming soon"),
        `${tool.id} public shell should not contain 'Coming soon'`,
      ).toBe(false);
      expect(
        /\bsoon\b/.test(lowerText) && !lowerText.includes("signature-placeholder"),
        `${tool.id} public shell should not contain standalone 'Soon'`,
      ).toBe(false);

      // Reject placeholder UI language (but allow "signature-placeholder" in descriptions)
      expect(
        lowerText.includes("placeholder page") || lowerText.includes("placeholder state"),
        `${tool.id} public shell should not contain placeholder UI language`,
      ).toBe(false);

      unmount();
    }
  });

  it("renders the correct title, description, and execution badge for a representative tool", () => {
    const tool = getPdfStudioTool("merge");
    render(
      <PdfStudioPublicToolShell tool={tool}>
        <div>children</div>
      </PdfStudioPublicToolShell>,
    );

    expect(screen.getByText(tool.title)).toBeInTheDocument();
    expect(screen.getByText(tool.description)).toBeInTheDocument();
    expect(screen.getByText("Use in browser")).toBeInTheDocument();
  });

  it("renders the processing badge for a worker-backed tool", () => {
    const tool = getPdfStudioTool("pdf-to-word");
    render(
      <PdfStudioPublicToolShell tool={tool}>
        <div>children</div>
      </PdfStudioPublicToolShell>,
    );

    expect(screen.getByText("Requires processing")).toBeInTheDocument();
  });

  it("renders the hybrid badge for a hybrid tool", () => {
    const tool = getPdfStudioTool("protect");
    render(
      <PdfStudioPublicToolShell tool={tool}>
        <div>children</div>
      </PdfStudioPublicToolShell>,
    );

    expect(screen.getByText("Browser + processing")).toBeInTheDocument();
  });
});
