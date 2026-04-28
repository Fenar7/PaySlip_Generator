import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProofUploadForm } from "./proof-upload-form";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

describe("ProofUploadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requires a next payment date for partial payments before submitting", async () => {
    const { container } = render(
      <ProofUploadForm token="public-token" invoiceTotal={5000} remainingAmount={5000} />
    );

    fireEvent.change(screen.getByLabelText("Amount Paid (₹)"), {
      target: { value: "3000" },
    });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [new File(["proof"], "payment.png", { type: "image/png" })],
      },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Submit Payment Proof" }).closest("form")!);

    expect(await screen.findByText("Select the next payment date for a partial payment")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows success state and refreshes the route after a successful upload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { proofId: "proof-1" },
      }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <ProofUploadForm token="public-token" invoiceTotal={5000} remainingAmount={5000} />
    );

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [new File(["proof"], "payment.png", { type: "image/png" })],
      },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Submit Payment Proof" }).closest("form")!);

    expect(await screen.findByText("Proof Uploaded Successfully")).toBeInTheDocument();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });
});
