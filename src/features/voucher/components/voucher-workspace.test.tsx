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

    fireEvent.change(screen.getByLabelText(/voucher number/i), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: /export pdf/i }));

    expect(
      await screen.findByText(/complete the required voucher fields before exporting/i),
    ).toBeInTheDocument();
  });
});
