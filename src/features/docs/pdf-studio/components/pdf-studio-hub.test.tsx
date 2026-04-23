import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfStudioHub } from "./pdf-studio-hub";

const { useActiveOrg, usePlan } = vi.hoisted(() => ({
  useActiveOrg: vi.fn(),
  usePlan: vi.fn(),
}));

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

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg,
}));

vi.mock("@/hooks/use-plan", () => ({
  usePlan,
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackUpgradeIntent: vi.fn(),
  }),
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-studio-capability-matrix", () => ({
  PdfStudioCapabilityMatrix: () => <div data-testid="capability-matrix" />,
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-studio-analytics-panel", () => ({
  PdfStudioAnalyticsPanel: ({ orgId }: { orgId?: string }) => (
    <div data-testid="analytics-panel">{orgId ?? "no-org"}</div>
  ),
}));

describe("PdfStudioHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveOrg.mockReturnValue({ activeOrg: { id: "org-123" } });
    usePlan.mockReturnValue({
      plan: { planId: "starter", planName: "Starter" },
      loading: false,
    });
  });

  it("keeps the public hub anonymous-safe", () => {
    render(<PdfStudioHub surface="public" />);

    expect(useActiveOrg).not.toHaveBeenCalled();
    expect(usePlan).not.toHaveBeenCalled();
    expect(screen.queryByTestId("analytics-panel")).not.toBeInTheDocument();
    expect(
      screen.getByText(/public tools stay browser-first/i),
    ).toBeInTheDocument();
  });

  it("loads org context on the workspace hub", () => {
    render(<PdfStudioHub surface="workspace" />);

    expect(useActiveOrg).toHaveBeenCalledTimes(1);
    expect(usePlan).toHaveBeenCalledWith("org-123");
    expect(screen.getByTestId("analytics-panel")).toHaveTextContent("org-123");
  });
});
