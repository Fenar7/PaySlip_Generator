/**
 * IN-GST region: wraps existing src/lib/gst/compute.ts
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult, TaxBreakdownLine, TaxLineResult } from "../engine";
import { taxRound2 } from "../engine";
import {
  computeLineGst,
  determineGstType,
  computeInvoiceGst,
  type GstComputeInput,
  type GstLineInput,
} from "@/lib/gst/compute";

export const inGstStrategy: TaxStrategy = {
  region: "IN_GST",
  displayName: "India GST",
  defaultCurrency: "INR",

  compute(input: TaxComputeInput): TaxComputeResult {
    const config = input.config as {
      supplierStateCode?: string;
      customerStateCode?: string;
      reverseCharge?: boolean;
      isCompositionScheme?: boolean;
      compositionRate?: number;
    };

    const gstInput: GstComputeInput = {
      supplierStateCode: config.supplierStateCode ?? "",
      customerStateCode: config.customerStateCode ?? "",
      lineItems: input.lines.map((l): GstLineInput => ({
        amount: l.amount,
        gstRate: l.taxRate ?? 18,
        isExempt: l.isExempt,
      })),
      reverseCharge: config.reverseCharge,
      isCompositionScheme: config.isCompositionScheme,
      compositionRate: config.compositionRate,
    };

    const summary = computeInvoiceGst(gstInput);

    const breakdown: TaxBreakdownLine[] = [];
    if (summary.totalCgst > 0) breakdown.push({ label: "CGST", rate: 0, amount: summary.totalCgst });
    if (summary.totalSgst > 0) breakdown.push({ label: "SGST", rate: 0, amount: summary.totalSgst });
    if (summary.totalIgst > 0) breakdown.push({ label: "IGST", rate: 0, amount: summary.totalIgst });
    if (summary.totalCess > 0) breakdown.push({ label: "CESS", rate: 0, amount: summary.totalCess });

    const lineResults: TaxLineResult[] = summary.lineResults.map((lr) => ({
      taxableAmount: lr.taxableAmount,
      taxAmount: lr.totalTax,
      effectiveRate: lr.gstRate,
      breakdown: [
        ...(lr.cgstAmount > 0 ? [{ label: "CGST", rate: lr.cgstRate, amount: lr.cgstAmount }] : []),
        ...(lr.sgstAmount > 0 ? [{ label: "SGST", rate: lr.sgstRate, amount: lr.sgstAmount }] : []),
        ...(lr.igstAmount > 0 ? [{ label: "IGST", rate: lr.igstRate, amount: lr.igstAmount }] : []),
        ...(lr.cessAmount > 0 ? [{ label: "CESS", rate: lr.cessRate, amount: lr.cessAmount }] : []),
      ],
    }));

    return {
      totalTaxable: summary.totalTaxableAmount,
      totalTax: summary.totalTax,
      effectiveRate: summary.totalTaxableAmount > 0
        ? taxRound2((summary.totalTax / summary.totalTaxableAmount) * 100)
        : 0,
      breakdown,
      lineResults,
      currency: "INR",
    };
  },
};
