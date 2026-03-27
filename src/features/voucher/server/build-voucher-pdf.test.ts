import { PDFDocument } from "pdf-lib";
import { voucherDefaultValues } from "@/features/voucher/constants";
import { buildVoucherPdf } from "@/features/voucher/server/build-voucher-pdf";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";

describe("buildVoucherPdf", () => {
  it("builds a single-page sharp PDF for the minimal office template", async () => {
    const bytes = await buildVoucherPdf(normalizeVoucher(voucherDefaultValues));

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("builds a single-page PDF for the traditional ledger template without optional sections", async () => {
    const bytes = await buildVoucherPdf(
      normalizeVoucher({
        ...voucherDefaultValues,
        templateId: "traditional-ledger",
        notes: "",
        referenceNumber: "",
        approvedBy: "",
        receivedBy: "",
        visibility: {
          ...voucherDefaultValues.visibility,
          showNotes: false,
          showReferenceNumber: false,
          showApprovedBy: false,
          showReceivedBy: false,
          showSignatureArea: false,
        },
      }),
    );

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
});
