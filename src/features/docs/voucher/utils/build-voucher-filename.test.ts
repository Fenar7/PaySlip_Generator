import { voucherDefaultValues } from "@/features/docs/voucher/constants";
import { normalizeVoucher } from "@/features/docs/voucher/utils/normalize-voucher";
import { buildVoucherFilename } from "@/features/docs/voucher/utils/build-voucher-filename";

describe("buildVoucherFilename", () => {
  it("builds a stable export filename from the voucher number", () => {
    const document = normalizeVoucher({
      ...voucherDefaultValues,
      voucherNumber: "PV 2026/014",
    });

    expect(buildVoucherFilename(document, "pdf")).toBe("voucher-pv-2026-014.pdf");
    expect(buildVoucherFilename(document, "png")).toBe("voucher-pv-2026-014.png");
  });
});
