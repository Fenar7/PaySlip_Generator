// GST Computation Engine — pure functions, no database dependencies

export type GstType = "INTRASTATE" | "INTERSTATE" | "EXEMPT";

export interface GstLineInput {
  amount: number;
  gstRate: number;
  cessRate?: number;
  isExempt?: boolean;
  hsnCode?: string;
}

export interface GstLineResult {
  gstType: GstType;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
  totalWithTax: number;
}

export interface GstInvoiceSummary {
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  grandTotal: number;
  gstType: GstType;
  reverseCharge: boolean;
  lineResults: GstLineResult[];
}

export interface GstComputeInput {
  supplierStateCode: string;
  customerStateCode: string;
  lineItems: GstLineInput[];
  reverseCharge?: boolean;
  isCompositionScheme?: boolean;
  compositionRate?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GST_RATE_SLABS = [0, 5, 12, 18, 28] as const;

export const INDIAN_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function determineGstType(
  supplierStateCode: string,
  customerStateCode: string,
): GstType {
  if (!supplierStateCode && !customerStateCode) return "EXEMPT";
  if (supplierStateCode === customerStateCode) return "INTRASTATE";
  return "INTERSTATE";
}

export function computeLineGst(
  line: GstLineInput,
  gstType: GstType,
): GstLineResult {
  const taxableAmount = round2(line.amount);
  const effectiveRate = line.isExempt ? 0 : line.gstRate;
  const effectiveType: GstType = line.isExempt ? "EXEMPT" : gstType;
  const cessRate = line.cessRate ?? 0;

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  switch (effectiveType) {
    case "INTRASTATE": {
      cgstRate = round2(effectiveRate / 2);
      sgstRate = round2(effectiveRate / 2);
      cgstAmount = round2(taxableAmount * (cgstRate / 100));
      sgstAmount = round2(taxableAmount * (sgstRate / 100));
      break;
    }
    case "INTERSTATE": {
      igstRate = effectiveRate;
      igstAmount = round2(taxableAmount * (igstRate / 100));
      break;
    }
    case "EXEMPT":
    default:
      break;
  }

  const cessAmount = round2(taxableAmount * (cessRate / 100));
  const totalTax = round2(cgstAmount + sgstAmount + igstAmount + cessAmount);
  const totalWithTax = round2(taxableAmount + totalTax);

  return {
    gstType: effectiveType,
    taxableAmount,
    gstRate: effectiveRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalTax,
    totalWithTax,
  };
}

export function computeInvoiceGst(input: GstComputeInput): GstInvoiceSummary {
  const gstType = determineGstType(
    input.supplierStateCode,
    input.customerStateCode,
  );

  // Composition scheme: flat rate on total taxable amount
  if (input.isCompositionScheme && input.compositionRate !== undefined) {
    const totalTaxable = round2(
      input.lineItems.reduce((sum, li) => sum + li.amount, 0),
    );
    const flatLine: GstLineInput = {
      amount: totalTaxable,
      gstRate: input.compositionRate,
    };
    const lineResult = computeLineGst(flatLine, gstType);

    return {
      totalTaxableAmount: totalTaxable,
      totalCgst: lineResult.cgstAmount,
      totalSgst: lineResult.sgstAmount,
      totalIgst: lineResult.igstAmount,
      totalCess: lineResult.cessAmount,
      totalTax: lineResult.totalTax,
      grandTotal: lineResult.totalWithTax,
      gstType,
      reverseCharge: input.reverseCharge ?? false,
      lineResults: [lineResult],
    };
  }

  const lineResults = input.lineItems.map((li) => computeLineGst(li, gstType));

  const totalTaxableAmount = round2(
    lineResults.reduce((s, r) => s + r.taxableAmount, 0),
  );
  const totalCgst = round2(lineResults.reduce((s, r) => s + r.cgstAmount, 0));
  const totalSgst = round2(lineResults.reduce((s, r) => s + r.sgstAmount, 0));
  const totalIgst = round2(lineResults.reduce((s, r) => s + r.igstAmount, 0));
  const totalCess = round2(lineResults.reduce((s, r) => s + r.cessAmount, 0));
  const totalTax = round2(totalCgst + totalSgst + totalIgst + totalCess);
  const grandTotal = round2(totalTaxableAmount + totalTax);

  return {
    totalTaxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess,
    totalTax,
    grandTotal,
    gstType,
    reverseCharge: input.reverseCharge ?? false,
    lineResults,
  };
}

export function validateGstin(gstin: string): {
  valid: boolean;
  stateCode: string;
  error?: string;
} {
  if (!gstin || gstin.length !== 15) {
    return { valid: false, stateCode: "", error: "GSTIN must be 15 characters" };
  }

  if (!GSTIN_REGEX.test(gstin)) {
    return { valid: false, stateCode: "", error: "Invalid GSTIN format" };
  }

  const stateCode = gstin.substring(0, 2);
  if (!INDIAN_STATE_CODES[stateCode]) {
    return { valid: false, stateCode, error: `Invalid state code: ${stateCode}` };
  }

  return { valid: true, stateCode };
}

export function extractStateCode(gstin: string): string {
  return gstin.substring(0, 2);
}

export function validateHsnCode(code: string): boolean {
  return /^[0-9]{4}$|^[0-9]{6}$|^[0-9]{8}$/.test(code);
}

export function validateSacCode(code: string): boolean {
  return /^99[0-9]{4}$/.test(code);
}
