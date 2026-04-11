import "server-only";

// IRP API modes
const IRP_SANDBOX_URL = process.env.IRP_SANDBOX_URL ?? "https://einv-apisandbox.nic.in";
const IRP_PRODUCTION_URL = process.env.IRP_API_BASE_URL ?? "https://einvoice1.gst.gov.in/eicore/v1.03";
const IRP_MODE = process.env.IRP_MODE ?? "sandbox";

export function getBaseUrl(): string {
  return IRP_MODE === "production" ? IRP_PRODUCTION_URL : IRP_SANDBOX_URL;
}

// Session token cache
let cachedToken: { token: string; expiresAt: Date } | null = null;

// Types
export interface IrpCredentials {
  clientId: string;
  clientSecret: string;
  gstin: string;
  username: string;
  password: string;
}

export interface IrpSession {
  authToken: string;
  tokenExpiry: Date;
  sek: string; // Session Encryption Key
}

export interface IrnGenerateRequest {
  invoiceNumber: string;
  invoiceDate: string; // DD/MM/YYYY
  invoiceType: "INV" | "CRN" | "DBN";
  supplierGstin: string;
  supplierLegalName: string;
  supplierAddress: string;
  supplierStateCode: string;
  supplierPincode: string;
  buyerGstin: string;
  buyerLegalName: string;
  buyerAddress: string;
  buyerStateCode: string;
  buyerPincode: string;
  totalAmount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  lineItems: IrnLineItem[];
  reverseCharge: boolean;
}

export interface IrnLineItem {
  slNo: number;
  productDescription: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
}

export interface IrnResponse {
  success: boolean;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  signedInvoice?: string;
  signedQrCode?: string;
  error?: IrpError;
}

export interface IrpError {
  code: string;
  message: string;
  userMessage: string;
}

// IRP Error codes mapping
export const IRP_ERROR_MAP: Record<string, string> = {
  "2150": "This invoice already has an IRN. The existing IRN has been fetched.",
  "2283": "Invalid HSN code on one or more line items. Please correct and retry.",
  "2163": "GSTIN is not active or is suspended. Verify the GSTIN and retry.",
  "2165": "GSTIN format is invalid. Please check the supplier/buyer GSTIN.",
  "2166": "Place of supply does not match the GSTIN state code.",
  "2167": "Invoice date is in the future. Use today's date or earlier.",
  "2168": "Invoice date is too old. IRN must be generated within 30 days of invoice date.",
  "2170": "Invoice amount does not match line item totals.",
  "2171": "Tax amounts do not match the declared rates.",
  "2250": "IRP session has expired. Refreshing authentication...",
  "2260": "IRP service temporarily unavailable. Please try again shortly.",
  "AUTH001": "IRP authentication failed. Check API credentials.",
  "GEN_ERR": "An unexpected IRP error occurred. Please try again or contact support.",
};

/**
 * Get or refresh IRP session token
 */
export async function getIrpSession(): Promise<IrpSession> {
  // Check cached token (refresh 5 minutes before expiry)
  if (cachedToken && cachedToken.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return { authToken: cachedToken.token, tokenExpiry: cachedToken.expiresAt, sek: "" };
  }

  const baseUrl = getBaseUrl();
  const clientId = process.env.IRP_CLIENT_ID;
  const clientSecret = process.env.IRP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("IRP credentials not configured. Set IRP_CLIENT_ID and IRP_CLIENT_SECRET.");
  }

  const response = await fetchWithRetry(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "client_id": clientId,
      "client_secret": clientSecret,
    },
    body: JSON.stringify({
      UserName: process.env.IRP_USERNAME ?? "",
      Password: process.env.IRP_PASSWORD ?? "",
      ForceRefreshAccessToken: "true",
    }),
  });

  if (!response.ok) {
    throw new Error(`IRP authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  const tokenExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

  cachedToken = {
    token: data.Data?.AuthToken ?? data.authToken ?? "",
    expiresAt: tokenExpiry,
  };

  return {
    authToken: cachedToken.token,
    tokenExpiry,
    sek: data.Data?.Sek ?? "",
  };
}

/**
 * Refresh IRP session (called by background job)
 */
export async function refreshIrpSession(): Promise<{ success: boolean; expiresAt: Date }> {
  cachedToken = null; // Force refresh
  const session = await getIrpSession();
  return { success: true, expiresAt: session.tokenExpiry };
}

/**
 * Generate IRN for an invoice
 */
export async function generateIrn(request: IrnGenerateRequest): Promise<IrnResponse> {
  const session = await getIrpSession();
  const baseUrl = getBaseUrl();

  const irpPayload = buildIrpPayload(request);

  const response = await fetchWithRetry(`${baseUrl}/eicore/dec/v1.03`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.authToken}`,
      "client_id": process.env.IRP_CLIENT_ID ?? "",
      "gstin": request.supplierGstin,
    },
    body: JSON.stringify(irpPayload),
  });

  const data = await response.json();

  // Handle duplicate IRN error - fetch existing
  if (data.ErrorCode === "2150" || data.error?.code === "2150") {
    return await fetchExistingIrn(request.supplierGstin, request.invoiceNumber, request.invoiceDate);
  }

  if (!response.ok || data.ErrorCode) {
    const errorCode = data.ErrorCode ?? data.error?.code ?? "GEN_ERR";
    const userMessage = IRP_ERROR_MAP[errorCode] ?? IRP_ERROR_MAP["GEN_ERR"];
    return {
      success: false,
      error: {
        code: errorCode,
        message: data.ErrorMessage ?? data.error?.message ?? "Unknown IRP error",
        userMessage: userMessage!,
      },
    };
  }

  return {
    success: true,
    irn: data.Data?.Irn ?? data.Irn,
    ackNo: data.Data?.AckNo?.toString() ?? data.AckNo?.toString(),
    ackDate: data.Data?.AckDt ?? data.AckDt,
    signedInvoice: data.Data?.SignedInvoice,
    signedQrCode: data.Data?.SignedQRCode,
  };
}

/**
 * Cancel an existing IRN
 */
export async function cancelIrn(
  irn: string,
  reason: "1" | "2" | "3" | "4", // 1=Duplicate, 2=Data entry mistake, 3=Order cancelled, 4=Other
  remark: string,
  gstin: string
): Promise<IrnResponse> {
  const session = await getIrpSession();
  const baseUrl = getBaseUrl();

  const response = await fetchWithRetry(`${baseUrl}/eicore/dec/v1.03/Cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.authToken}`,
      "client_id": process.env.IRP_CLIENT_ID ?? "",
      "gstin": gstin,
    },
    body: JSON.stringify({
      Irn: irn,
      CnlRsn: reason,
      CnlRem: remark,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.ErrorCode) {
    const errorCode = data.ErrorCode ?? "GEN_ERR";
    return {
      success: false,
      error: {
        code: errorCode,
        message: data.ErrorMessage ?? "Cancel failed",
        userMessage: IRP_ERROR_MAP[errorCode] ?? IRP_ERROR_MAP["GEN_ERR"]!,
      },
    };
  }

  return { success: true, irn };
}

/**
 * Fetch an existing IRN by document details
 */
async function fetchExistingIrn(gstin: string, invoiceNumber: string, invoiceDate: string): Promise<IrnResponse> {
  const session = await getIrpSession();
  const baseUrl = getBaseUrl();

  const response = await fetchWithRetry(
    `${baseUrl}/eicore/dec/v1.03/GetIRNByDocDtls?doctype=INV&docnum=${encodeURIComponent(invoiceNumber)}&docdate=${encodeURIComponent(invoiceDate)}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session.authToken}`,
        "client_id": process.env.IRP_CLIENT_ID ?? "",
        "gstin": gstin,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.ErrorCode) {
    return {
      success: false,
      error: {
        code: data.ErrorCode ?? "GEN_ERR",
        message: data.ErrorMessage ?? "Fetch failed",
        userMessage: "Could not fetch existing IRN. Please try again.",
      },
    };
  }

  return {
    success: true,
    irn: data.Data?.Irn ?? data.Irn,
    ackNo: data.Data?.AckNo?.toString(),
    ackDate: data.Data?.AckDt,
    signedQrCode: data.Data?.SignedQRCode,
  };
}

/**
 * Build IRP-format payload from our request format
 */
export function buildIrpPayload(req: IrnGenerateRequest): Record<string, unknown> {
  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: req.reverseCharge ? "SEZWP" : "B2B",
      RegRev: req.reverseCharge ? "Y" : "N",
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: req.invoiceType,
      No: req.invoiceNumber,
      Dt: req.invoiceDate,
    },
    SellerDtls: {
      Gstin: req.supplierGstin,
      LglNm: req.supplierLegalName,
      Addr1: req.supplierAddress.slice(0, 100),
      Loc: req.supplierAddress.slice(0, 50),
      Pin: parseInt(req.supplierPincode) || 0,
      Stcd: req.supplierStateCode,
    },
    BuyerDtls: {
      Gstin: req.buyerGstin,
      LglNm: req.buyerLegalName,
      Addr1: req.buyerAddress.slice(0, 100),
      Loc: req.buyerAddress.slice(0, 50),
      Pin: parseInt(req.buyerPincode) || 0,
      Stcd: req.buyerStateCode,
      Pos: req.buyerStateCode,
    },
    ItemList: req.lineItems.map((item) => ({
      SlNo: item.slNo.toString(),
      PrdDesc: item.productDescription,
      IsServc: item.hsnCode.startsWith("99") ? "Y" : "N",
      HsnCd: item.hsnCode,
      Qty: item.quantity,
      Unit: item.unit || "NOS",
      UnitPrice: item.unitPrice,
      TotAmt: item.totalAmount,
      AssAmt: item.taxableAmount,
      GstRt: item.gstRate,
      CgstAmt: item.cgstAmount,
      SgstAmt: item.sgstAmount,
      IgstAmt: item.igstAmount,
      CesRt: 0,
      CesAmt: item.cessAmount,
      TotItemVal: item.totalAmount + item.cgstAmount + item.sgstAmount + item.igstAmount + item.cessAmount,
    })),
    ValDtls: {
      AssVal: req.totalTaxableAmount,
      CgstVal: req.totalCgst,
      SgstVal: req.totalSgst,
      IgstVal: req.totalIgst,
      CesVal: req.totalCess,
      Discount: 0,
      OthChrg: 0,
      RndOffAmt: 0,
      TotInvVal: req.totalAmount,
    },
  };
}

/**
 * Fetch with retry (3 attempts, exponential backoff)
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // If 401/session expired, refresh token and retry once
      if (response.status === 401 && attempt === 1) {
        cachedToken = null;
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError ?? new Error("IRP API request failed after retries");
}
