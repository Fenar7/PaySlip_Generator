import { render, screen } from "@testing-library/react";
import { ModuleCard } from "@/components/foundation/module-card";
import { productModules } from "@/lib/modules";

describe("ModuleCard", () => {
  it("renders module information and CTA", () => {
    render(<ModuleCard module={productModules[0]} />);

    expect(
      screen.getByRole("heading", { name: "Voucher Generator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open workspace/i }),
    ).toHaveAttribute("href", "/voucher");
  });
});
