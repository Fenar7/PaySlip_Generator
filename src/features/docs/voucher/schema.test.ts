import { voucherDefaultValues } from "@/features/docs/voucher/constants";
import {
  voucherDocumentSchema,
  voucherExportRequestSchema,
} from "@/features/docs/voucher/schema";
import { normalizeVoucher } from "@/features/docs/voucher/utils/normalize-voucher";

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
