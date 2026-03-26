import { fireEvent, render, screen } from "@testing-library/react";
import InvoicePage from "@/app/invoice/page";

describe("Invoice workspace", () => {
  it("renders the interactive invoice builder", () => {
    render(<InvoicePage />);

    expect(
      screen.getByRole("heading", { name: "Invoice Generator", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /bold brand/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/tax invoice · professional/i)).toBeInTheDocument();
  });

  it("updates the preview when line items change", () => {
    render(<InvoicePage />);

    fireEvent.change(screen.getByLabelText(/amount paid/i), {
      target: { value: "20000" },
    });

    expect(screen.getByText(/₹33,100.00/i)).toBeInTheDocument();
  });

  it("hides notes when the notes visibility toggle is disabled", () => {
    render(<InvoicePage />);

    expect(
      screen.getByText(/thank you for the continued engagement/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("switch", {
        name: /notes/i,
      }),
    );

    expect(
      screen.queryByText(/thank you for the continued engagement/i),
    ).not.toBeInTheDocument();
  });
});
