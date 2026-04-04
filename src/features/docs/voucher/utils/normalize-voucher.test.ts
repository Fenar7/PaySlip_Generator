import { voucherDefaultValues } from "@/features/docs/voucher/constants";
import { normalizeVoucher } from "@/features/docs/voucher/utils/normalize-voucher";

describe("normalizeVoucher", () => {
  it("maps payment vouchers to the correct title and labels", () => {
    const document = normalizeVoucher(voucherDefaultValues);

    expect(document.title).toBe("Payment Voucher");
    expect(document.counterpartyLabel).toBe("Paid to");
    expect(document.amount).toBe(1850);
  });

  it("prunes hidden optional fields from the preview payload", () => {
    const document = normalizeVoucher({
      ...voucherDefaultValues,
      visibility: {
        ...voucherDefaultValues.visibility,
        showNotes: false,
        showReferenceNumber: false,
      },
    });

    expect(document.notes).toBeUndefined();
    expect(document.referenceNumber).toBeUndefined();
  });

  it("switches labels for receipt vouchers", () => {
    const document = normalizeVoucher({
      ...voucherDefaultValues,
      voucherType: "receipt",
    });

    expect(document.title).toBe("Receipt Voucher");
    expect(document.counterpartyLabel).toBe("Received from");
  });
});
