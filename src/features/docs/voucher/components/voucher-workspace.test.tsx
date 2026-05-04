import { fireEvent, render, screen } from "@testing-library/react";
import VoucherPage from "@/app/voucher/page";

describe("Voucher workspace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the interactive voucher builder", () => {
    render(<VoucherPage />);

    expect(
      screen.getByRole("heading", { name: "Voucher Generator", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /traditional ledger/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/payment voucher/i).length).toBeGreaterThan(0);
  });

  it("updates the preview when the voucher type changes", () => {
    render(<VoucherPage />);

    fireEvent.change(screen.getByLabelText(/voucher type/i), {
      target: { value: "receipt" },
    });

    expect(screen.getByText("Receipt Voucher")).toBeInTheDocument();
    expect(screen.getByLabelText(/received from/i)).toBeInTheDocument();
  });

  it("hides notes from the preview when the visibility toggle is disabled", () => {
    render(<VoucherPage />);

    expect(
      screen.getByText("Settled after manager approval."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("switch", {
        name: /notes/i,
      }),
    );

    expect(
      screen.queryByText("Settled after manager approval."),
    ).not.toBeInTheDocument();
  });

  it("shows an error state when export validation fails", async () => {
    render(<VoucherPage />);

    // Switch to Document view so inline edit fields are visible in jsdom
    // (preview is hidden by default on non-desktop viewports).
    const documentViewButtons = screen.getAllByRole("button", { name: /document/i });
    fireEvent.click(documentViewButtons[documentViewButtons.length - 1]);

    // Counterparty field has placeholder "Name" and is the first such input
    // in the default payment voucher layout.
    fireEvent.change(screen.getAllByPlaceholderText("Name")[0], {
      target: { value: "" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: /export pdf/i })[0]);

    expect(
      await screen.findByText(/complete the required voucher fields before exporting/i),
    ).toBeInTheDocument();
  });
});
