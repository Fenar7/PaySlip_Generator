import { voucherDefaultValues } from "@/features/voucher/constants";
import { renderVoucherPdfHtml } from "@/features/voucher/server/render-voucher-pdf";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";

describe("renderVoucherPdfHtml", () => {
  it("renders the selected template into export-safe HTML", () => {
    const minimal = renderVoucherPdfHtml(normalizeVoucher(voucherDefaultValues));
    const ledger = renderVoucherPdfHtml(
      normalizeVoucher({
        ...voucherDefaultValues,
        templateId: "traditional-ledger",
      }),
    );

    expect(minimal).toContain('data-template-id="minimal-office"');
    expect(minimal).toContain("Purpose / Narration");
    expect(minimal).toContain("25 Mar 2026");

    expect(ledger).toContain('data-template-id="traditional-ledger"');
    expect(ledger).toContain("Formal voucher record");
    expect(ledger).toContain("Travel reimbursement for site visit.");
  });

  it("omits hidden optional sections from the PDF output", () => {
    const document = normalizeVoucher({
      ...voucherDefaultValues,
      referenceNumber: "REF-8831",
      notes: "Settled after manager approval.",
      approvedBy: "Anita Thomas",
      receivedBy: "Rahul Menon",
      visibility: {
        ...voucherDefaultValues.visibility,
        showReferenceNumber: false,
        showNotes: false,
        showSignatureArea: false,
        showApprovedBy: false,
        showReceivedBy: false,
      },
    });

    const html = renderVoucherPdfHtml(document);

    expect(html).not.toContain("REF-8831");
    expect(html).not.toContain("Settled after manager approval.");
    expect(html).not.toContain("Approved by");
    expect(html).not.toContain("Received by");
  });
});
