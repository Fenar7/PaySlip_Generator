import { fireEvent, render, screen } from "@testing-library/react";
import InvoicePage from "@/app/invoice/page";

describe("Invoice workspace", () => {
  it("renders the interactive invoice builder", () => {
    render(<InvoicePage />);

    expect(
      screen.getByRole("heading", { name: "Invoice Generator", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/template and branding/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /professional/i })).toBeInTheDocument();
    expect(screen.getByText(/live a4 document/i)).toBeInTheDocument();
  });

  it("updates the preview when line items change", () => {
    render(<InvoicePage />);

    fireEvent.change(screen.getByLabelText(/amount paid/i), {
      target: { value: "20000" },
    });

    expect(screen.getByText(/₹34,100.00/i)).toBeInTheDocument();
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

  it("hides the payment summary block when the visibility toggle is disabled", () => {
    render(<InvoicePage />);

    expect(screen.getAllByText(/₹39,100.00/i).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("switch", {
        name: /payment summary/i,
      }),
    );

    expect(screen.queryByText(/₹39,100.00/i)).not.toBeInTheDocument();
  });
});
