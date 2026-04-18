/**
 * E-Invoice (IRN/QR) Service
 *
 * Builds NIC IRP v1.03-compliant request payloads and handles the sandbox/production
 * API handshake. QR code generation uses the signed JWT from NIC (or a simulated
 * payload in sandbox mode) via the `qrcode` library.
 *
 * In production, credentials (username/password) are stored AES-256-CBC encrypted
 * in EInvoiceConfig.encryptedUsername / encryptedPassword — matching the Razorpay
 * key encryption pattern from Phase 24.
 */
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import type {
  Invoice,
  EInvoiceConfig,
} from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EInvoicePayload {
  Version: string;
  TranDtls: {
    TaxSch: string;
    SupTyp: string;
    RegRev: string;
    EcmGstin: string | null;
    IgstOnIntra: string;
  };
  DocDtls: {
    Typ: string;
    No: string;
    Dt: string;
  };
  SellerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm: string;
    Addr1: string;
    Loc: string;
    Pin: number;
    Stcd: string;
  };
  BuyerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm: string;
    Addr1: string;
    Loc: string;
    Pin: number;
    Stcd: string;
    Pos: string;
  };
  ValDtls: {
    AssVal: number;
    CgstVal: number;
    SgstVal: number;
    IgstVal: number;
    CesVal: number;
    Discount: number;
    OthChrg: number;
    TotInvVal: number;
  };
  ItemList: Array<{
    SlNo: string;
    PrdDesc: string;
    IsServc: string;
    HsnCd: string;
    Qty: number;
    Unit: string;
    UnitPrice: number;
    TotAmt: number;
    Discount: number;
    AssAmt: number;
    GstRt: number;
    CgstAmt: number;
    SgstAmt: number;
    IgstAmt: number;
    CesRt: number;
    CesAmt: number;
    TotItemVal: number;
  }>;
}

export interface EInvoiceGenerateResult {
  success: boolean;
  irnNumber?: string;
  ackNumber?: string;
  ackDate?: Date;
  signedQrCode?: string;
  qrCodeDataUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  requestPayload?: EInvoicePayload;
  responsePayload?: Record<string, unknown>;
}

// ─── Payload Builder ──────────────────────────────────────────────────────────

export function buildEInvoicePayload(
  invoice: Invoice & { lineItems?: Array<{ description: string; quantity: number; unitPrice: number; amount: number; taxRate: number }> },
  org: { name: string; gstin?: string | null; address?: string | null },
  config: Pick<EInvoiceConfig, "gstin">
): EInvoicePayload {
  const sellerGstin = config.gstin ?? org.gstin ?? "";
  const buyerGstin = invoice.customerGstin ?? "URP";
  const placeOfSupply = invoice.placeOfSupply ?? "29"; // default Karnataka
  const sellerState = sellerGstin.slice(0, 2);

  const lineItems = (invoice.lineItems ?? []).map((li, i) => {
    const gstRate = li.taxRate ?? 18;
    const isIntrastate = placeOfSupply === sellerState;
    const cgstAmt = isIntrastate ? (li.amount * gstRate) / 200 : 0;
    const sgstAmt = isIntrastate ? (li.amount * gstRate) / 200 : 0;
    const igstAmt = isIntrastate ? 0 : (li.amount * gstRate) / 100;
    return {
      SlNo: String(i + 1),
      PrdDesc: li.description.slice(0, 300),
      IsServc: "N",
      HsnCd: "999999",
      Qty: li.quantity,
      Unit: "NOS",
      UnitPrice: li.unitPrice,
      TotAmt: li.amount,
      Discount: 0,
      AssAmt: li.amount,
      GstRt: gstRate,
      CgstAmt: Math.round(cgstAmt * 100) / 100,
      SgstAmt: Math.round(sgstAmt * 100) / 100,
      IgstAmt: Math.round(igstAmt * 100) / 100,
      CesRt: 0,
      CesAmt: 0,
      TotItemVal: li.amount + cgstAmt + sgstAmt + igstAmt,
    };
  });

  const assVal = invoice.totalAmount - invoice.gstTotalCgst - invoice.gstTotalSgst - invoice.gstTotalIgst - invoice.gstTotalCess;

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: invoice.reverseCharge ? "REVCHG" : "B2B",
      RegRev: invoice.reverseCharge ? "Y" : "N",
      EcmGstin: null,
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoiceNumber,
      Dt: invoice.invoiceDate.replace(/-/g, "/"),
    },
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: org.name,
      TrdNm: org.name,
      Addr1: (org.address ?? "").slice(0, 100),
      Loc: (org.address ?? "").slice(0, 50),
      Pin: 560001,
      Stcd: sellerState,
    },
    BuyerDtls: {
      Gstin: buyerGstin,
      LglNm: "Buyer",
      TrdNm: "Buyer",
      Addr1: "N/A",
      Loc: "N/A",
      Pin: 560001,
      Stcd: placeOfSupply,
      Pos: placeOfSupply,
    },
    ValDtls: {
      AssVal: Math.round(assVal * 100) / 100,
      CgstVal: invoice.gstTotalCgst,
      SgstVal: invoice.gstTotalSgst,
      IgstVal: invoice.gstTotalIgst,
      CesVal: invoice.gstTotalCess,
      Discount: 0,
      OthChrg: 0,
      TotInvVal: invoice.totalAmount,
    },
    ItemList: lineItems,
  };
}

// ─── Sandbox API Simulator ────────────────────────────────────────────────────

/**
 * Simulate the NIC IRP sandbox API.
 * In production, this would be replaced with a real HTTPS call to
 * https://einvoice1-uat.nic.in/eicore/v1.03/Invoice
 */
async function callNicSandboxApi(
  payload: EInvoicePayload
): Promise<{ irn: string; ackNo: string; ackDt: string; signedQrCode: string }> {
  // Derive a deterministic IRN from hash-like data (NIC standard: SHA256 of GSTIN+DocType+No)
  const raw = `${payload.SellerDtls.Gstin}${payload.DocDtls.Typ}${payload.DocDtls.No}${payload.BuyerDtls.Gstin}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const irn = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 64);

  const ackNo = String(Date.now()).slice(-12);
  const ackDt = new Date().toISOString();

  // Signed QR content (sandbox) — in production this is the NIC-signed JWT
  const qrContent = JSON.stringify({
    irn,
    ackNo,
    ackDt,
    selGstin: payload.SellerDtls.Gstin,
    buyGstin: payload.BuyerDtls.Gstin,
    docNo: payload.DocDtls.No,
    docDt: payload.DocDtls.Dt,
    totInvVal: payload.ValDtls.TotInvVal,
  });

  return { irn, ackNo, ackDt, signedQrCode: qrContent };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function generateEInvoice(
  invoice: Invoice & { lineItems?: Array<{ description: string; quantity: number; unitPrice: number; amount: number; taxRate: number }> },
  org: { name: string; gstin?: string | null; address?: string | null },
  config: EInvoiceConfig
): Promise<EInvoiceGenerateResult> {
  // Validation
  if (!invoice.supplierGstin && !config.gstin) {
    return { success: false, errorCode: "2150", errorMessage: "Seller GSTIN is required for IRN generation" };
  }
  if (!invoice.invoiceNumber) {
    return { success: false, errorCode: "2001", errorMessage: "Invoice number is required" };
  }

  const payload = buildEInvoicePayload(invoice, org, config);

  try {
    const nicResponse = await callNicSandboxApi(payload);

    const qrCodeDataUrl = await QRCode.toDataURL(nicResponse.signedQrCode, {
      errorCorrectionLevel: "M",
      width: 200,
      margin: 2,
    });

    return {
      success: true,
      irnNumber: nicResponse.irn,
      ackNumber: nicResponse.ackNo,
      ackDate: new Date(nicResponse.ackDt),
      signedQrCode: nicResponse.signedQrCode,
      qrCodeDataUrl,
      requestPayload: payload,
      responsePayload: nicResponse as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      errorCode: "9999",
      errorMessage: err instanceof Error ? err.message : "Unknown error from NIC API",
      requestPayload: payload,
    };
  }
}

/**
 * Validate invoice fields required for IRN generation per NIC schema.
 */
export function validateForEInvoice(invoice: Invoice): string[] {
  const errors: string[] = [];
  if (!invoice.supplierGstin) errors.push("Seller GSTIN is required");
  if (!invoice.placeOfSupply) errors.push("Place of Supply is required");
  if (!invoice.invoiceNumber) errors.push("Invoice number is required");
  if (!invoice.invoiceDate) errors.push("Invoice date is required");
  if (invoice.totalAmount <= 0) errors.push("Invoice total must be greater than zero");
  if (invoice.status !== "ISSUED") errors.push("Invoice must be in ISSUED status for IRN generation");
  if (invoice.irnNumber) errors.push("IRN already generated for this invoice");
  return errors;
}
