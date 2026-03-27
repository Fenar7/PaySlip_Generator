import { voucherDefaultValues } from "@/features/voucher/constants";
import {
  buildVoucherPdfBootstrapHtml,
  buildVoucherPdfCliArgs,
} from "@/features/voucher/server/export-voucher-pdf";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";

describe("exportVoucherPdf helpers", () => {
  it("builds bootstrap html that forwards the normalized voucher payload to the print route", () => {
    const html = buildVoucherPdfBootstrapHtml({
      voucherDocument: normalizeVoucher(voucherDefaultValues),
      origin: "http://127.0.0.1:3000",
    });

    expect(html).toContain("Preparing voucher PDF");
    expect(html).toContain("window.name =");
    expect(html).toContain("/voucher/print?mode=export&source=pdf");
    expect(html).toContain("Northfield Trading Co.");
  });

  it("builds chrome cli args that print the bootstrap page to a PDF file", () => {
    const args = buildVoucherPdfCliArgs({
      bootstrapPath: "/tmp/voucher-bootstrap.html",
      outputPath: "/tmp/voucher.pdf",
    });

    expect(args).toContain("--print-to-pdf-no-header");
    expect(args).toContain("--headless=new");
    expect(args).toContain("--virtual-time-budget=15000");
    expect(args).toContain("--window-size=1280,1810");
    expect(args.some((value) => value.includes("--print-to-pdf=/tmp/voucher.pdf"))).toBe(
      true,
    );
    expect(args.at(-1)).toBe("file:///tmp/voucher-bootstrap.html");
  });
});
