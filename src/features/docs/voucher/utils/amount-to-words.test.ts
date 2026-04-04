import { amountToWords } from "@/features/docs/voucher/utils/amount-to-words";

describe("amountToWords", () => {
  it("converts whole numbers", () => {
    expect(amountToWords(1850)).toBe("One thousand eight hundred fifty only");
  });

  it("converts decimals with paise", () => {
    expect(amountToWords(99.5)).toBe("Ninety-nine and fifty paise only");
  });
});
