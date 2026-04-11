import { describe, it, expect } from "vitest";
import {
  determineGstType,
  computeLineGst,
  computeInvoiceGst,
  validateGstin,
  extractStateCode,
  validateHsnCode,
  validateSacCode,
  GST_RATE_SLABS,
  INDIAN_STATE_CODES,
} from "@/lib/gst/compute";

// ---------------------------------------------------------------------------
// TC-15-001: Intrastate invoice — CGST + SGST split
// ---------------------------------------------------------------------------
describe("TC-15-001: Intrastate CGST + SGST", () => {
  it("splits GST equally into CGST and SGST for same-state", () => {
    const result = computeLineGst({ amount: 1000, gstRate: 18 }, "INTRASTATE");
    expect(result.gstType).toBe("INTRASTATE");
    expect(result.cgstRate).toBe(9);
    expect(result.sgstRate).toBe(9);
    expect(result.cgstAmount).toBe(90);
    expect(result.sgstAmount).toBe(90);
    expect(result.igstAmount).toBe(0);
    expect(result.totalTax).toBe(180);
    expect(result.totalWithTax).toBe(1180);
  });
});

// ---------------------------------------------------------------------------
// TC-15-002: Interstate invoice — IGST
// ---------------------------------------------------------------------------
describe("TC-15-002: Interstate IGST", () => {
  it("applies full rate as IGST for different-state", () => {
    const result = computeLineGst({ amount: 1000, gstRate: 18 }, "INTERSTATE");
    expect(result.gstType).toBe("INTERSTATE");
    expect(result.igstRate).toBe(18);
    expect(result.igstAmount).toBe(180);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.totalTax).toBe(180);
    expect(result.totalWithTax).toBe(1180);
  });
});

// ---------------------------------------------------------------------------
// TC-15-003: GST-exempt line item
// ---------------------------------------------------------------------------
describe("TC-15-003: Exempt line item", () => {
  it("computes zero tax for exempt items", () => {
    const result = computeLineGst(
      { amount: 500, gstRate: 18, isExempt: true },
      "INTRASTATE",
    );
    expect(result.gstType).toBe("EXEMPT");
    expect(result.totalTax).toBe(0);
    expect(result.totalWithTax).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// TC-15-007: GSTIN validation
// ---------------------------------------------------------------------------
describe("TC-15-007: GSTIN validation", () => {
  it("accepts a valid GSTIN", () => {
    // 27 = Maharashtra, AABCU9603R = PAN, 1 = entity, Z = default, M = check
    const res = validateGstin("27AABCU9603R1ZM");
    expect(res.valid).toBe(true);
    expect(res.stateCode).toBe("27");
    expect(res.error).toBeUndefined();
  });

  it("rejects GSTIN with wrong length", () => {
    const res = validateGstin("27AABCU9603R");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("15 characters");
  });

  it("rejects GSTIN with invalid format", () => {
    const res = validateGstin("27aabcu9603r1zm");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Invalid GSTIN format");
  });

  it("rejects GSTIN with invalid state code", () => {
    const res = validateGstin("99AABCU9603R1ZM");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Invalid state code");
  });
});

// ---------------------------------------------------------------------------
// TC-15-008: GSTIN validation before API call (edit-blocking scenario)
// ---------------------------------------------------------------------------
describe("TC-15-008: GSTIN validation blocks bad input early", () => {
  it("catches invalid GSTIN before any downstream processing", () => {
    const bad = validateGstin("INVALIDGSTIN!!!");
    expect(bad.valid).toBe(false);
    const good = validateGstin("07AAACR5055K1Z5");
    expect(good.valid).toBe(true);
    expect(good.stateCode).toBe("07");
  });
});

// ---------------------------------------------------------------------------
// TC-15-011: TDS amount = invoice total × tdsRate
// ---------------------------------------------------------------------------
describe("TC-15-011: Simple TDS calculation", () => {
  it("calculates TDS on the grand total", () => {
    const invoice = computeInvoiceGst({
      supplierStateCode: "27",
      customerStateCode: "27",
      lineItems: [{ amount: 10000, gstRate: 18 }],
    });
    const tdsRate = 10; // 10% TDS
    const tdsAmount = Math.round(invoice.grandTotal * (tdsRate / 100) * 100) / 100;
    expect(invoice.grandTotal).toBe(11800);
    expect(tdsAmount).toBe(1180);
  });
});

// ---------------------------------------------------------------------------
// determineGstType
// ---------------------------------------------------------------------------
describe("determineGstType", () => {
  it("returns INTRASTATE for same state codes", () => {
    expect(determineGstType("27", "27")).toBe("INTRASTATE");
  });

  it("returns INTERSTATE for different state codes", () => {
    expect(determineGstType("27", "07")).toBe("INTERSTATE");
  });

  it("returns EXEMPT when both state codes are empty", () => {
    expect(determineGstType("", "")).toBe("EXEMPT");
  });
});

// ---------------------------------------------------------------------------
// Multiple line items with different rates
// ---------------------------------------------------------------------------
describe("Invoice with multiple line items", () => {
  it("aggregates taxes across lines with different rates", () => {
    const invoice = computeInvoiceGst({
      supplierStateCode: "27",
      customerStateCode: "27",
      lineItems: [
        { amount: 1000, gstRate: 5 },
        { amount: 2000, gstRate: 18 },
        { amount: 500, gstRate: 28 },
      ],
    });
    expect(invoice.gstType).toBe("INTRASTATE");
    expect(invoice.lineResults).toHaveLength(3);

    // Line 1: 5% → CGST 2.5% + SGST 2.5%
    expect(invoice.lineResults[0].cgstAmount).toBe(25);
    expect(invoice.lineResults[0].sgstAmount).toBe(25);

    // Line 2: 18% → CGST 9% + SGST 9%
    expect(invoice.lineResults[1].cgstAmount).toBe(180);
    expect(invoice.lineResults[1].sgstAmount).toBe(180);

    // Line 3: 28% → CGST 14% + SGST 14%
    expect(invoice.lineResults[2].cgstAmount).toBe(70);
    expect(invoice.lineResults[2].sgstAmount).toBe(70);

    expect(invoice.totalTaxableAmount).toBe(3500);
    expect(invoice.totalCgst).toBe(275);
    expect(invoice.totalSgst).toBe(275);
    expect(invoice.totalTax).toBe(550);
    expect(invoice.grandTotal).toBe(4050);
  });
});

// ---------------------------------------------------------------------------
// Composition scheme
// ---------------------------------------------------------------------------
describe("Composition scheme", () => {
  it("applies flat composition rate instead of individual rates", () => {
    const invoice = computeInvoiceGst({
      supplierStateCode: "27",
      customerStateCode: "27",
      lineItems: [
        { amount: 5000, gstRate: 18 },
        { amount: 3000, gstRate: 28 },
      ],
      isCompositionScheme: true,
      compositionRate: 1,
    });
    // Total taxable = 8000, flat 1% → CGST 0.5% + SGST 0.5%
    expect(invoice.totalTaxableAmount).toBe(8000);
    expect(invoice.totalCgst).toBe(40);
    expect(invoice.totalSgst).toBe(40);
    expect(invoice.totalTax).toBe(80);
    expect(invoice.grandTotal).toBe(8080);
  });
});

// ---------------------------------------------------------------------------
// Edge case: 0% GST rate
// ---------------------------------------------------------------------------
describe("0% GST rate", () => {
  it("computes zero tax for 0% rate slab", () => {
    const result = computeLineGst({ amount: 2000, gstRate: 0 }, "INTRASTATE");
    expect(result.totalTax).toBe(0);
    expect(result.totalWithTax).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// Cess computation
// ---------------------------------------------------------------------------
describe("Cess computation", () => {
  it("adds cess on top of GST", () => {
    const result = computeLineGst(
      { amount: 1000, gstRate: 28, cessRate: 12 },
      "INTERSTATE",
    );
    expect(result.igstAmount).toBe(280);
    expect(result.cessRate).toBe(12);
    expect(result.cessAmount).toBe(120);
    expect(result.totalTax).toBe(400);
    expect(result.totalWithTax).toBe(1400);
  });
});

// ---------------------------------------------------------------------------
// Reverse charge flag
// ---------------------------------------------------------------------------
describe("Reverse charge", () => {
  it("marks invoice as reverse charge while still computing taxes", () => {
    const invoice = computeInvoiceGst({
      supplierStateCode: "27",
      customerStateCode: "07",
      lineItems: [{ amount: 1000, gstRate: 18 }],
      reverseCharge: true,
    });
    expect(invoice.reverseCharge).toBe(true);
    expect(invoice.totalIgst).toBe(180);
    expect(invoice.grandTotal).toBe(1180);
  });
});

// ---------------------------------------------------------------------------
// State code extraction
// ---------------------------------------------------------------------------
describe("extractStateCode", () => {
  it("extracts state code from GSTIN", () => {
    expect(extractStateCode("27AABCU9603R1ZM")).toBe("27");
    expect(extractStateCode("07AAACR5055K1Z5")).toBe("07");
  });
});

// ---------------------------------------------------------------------------
// HSN code validation
// ---------------------------------------------------------------------------
describe("validateHsnCode", () => {
  it("accepts 4-digit HSN codes", () => {
    expect(validateHsnCode("8471")).toBe(true);
  });

  it("accepts 6-digit HSN codes", () => {
    expect(validateHsnCode("847130")).toBe(true);
  });

  it("accepts 8-digit HSN codes", () => {
    expect(validateHsnCode("84713010")).toBe(true);
  });

  it("rejects 5-digit codes", () => {
    expect(validateHsnCode("84713")).toBe(false);
  });

  it("rejects non-numeric codes", () => {
    expect(validateHsnCode("ABCD")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SAC code validation
// ---------------------------------------------------------------------------
describe("validateSacCode", () => {
  it("accepts valid 6-digit SAC starting with 99", () => {
    expect(validateSacCode("998314")).toBe(true);
  });

  it("rejects codes not starting with 99", () => {
    expect(validateSacCode("123456")).toBe(false);
  });

  it("rejects codes with wrong length", () => {
    expect(validateSacCode("99831")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants sanity checks
// ---------------------------------------------------------------------------
describe("Constants", () => {
  it("has all 5 GST rate slabs", () => {
    expect(GST_RATE_SLABS).toEqual([0, 5, 12, 18, 28]);
  });

  it("has at least 30 state codes", () => {
    expect(Object.keys(INDIAN_STATE_CODES).length).toBeGreaterThanOrEqual(30);
  });
});
