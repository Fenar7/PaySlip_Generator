import { voucherDefaultValues } from "@/features/voucher/constants";
import {
  voucherDocumentSchema,
  voucherExportRequestSchema,
} from "@/features/voucher/schema";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";

describe("voucher export schemas", () => {
  it("accepts a normalized voucher document payload", () => {
    const document = normalizeVoucher(voucherDefaultValues);

    expect(voucherDocumentSchema.safeParse(document).success).toBe(true);
    expect(voucherExportRequestSchema.safeParse({ document }).success).toBe(true);
  });

  it("rejects malformed export payloads", () => {
    expect(
      voucherExportRequestSchema.safeParse({
        document: {
          voucherNumber: "",
        },
      }).success,
    ).toBe(false);
  });
});
