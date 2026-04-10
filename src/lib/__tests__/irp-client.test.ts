import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Env setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("IRP_CLIENT_ID", "test-client-id");
  vi.stubEnv("IRP_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("IRP_USERNAME", "test-user");
  vi.stubEnv("IRP_PASSWORD", "test-pass");
  vi.stubEnv("IRP_MODE", "sandbox");
  mockFetch.mockReset();

  // Reset the cached token by re-importing (we call refreshIrpSession to clear it)
  vi.resetModules();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockAuthResponse() {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      Data: {
        AuthToken: "mock-auth-token-123",
        Sek: "mock-sek-key",
      },
    }),
  };
}

function mockIrnGenerateResponse() {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      Data: {
        Irn: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        AckNo: 123456789,
        AckDt: "01/01/2025 10:00:00",
        SignedInvoice: "signed-jwt-data",
        SignedQRCode: "signed-qr-data",
      },
    }),
  };
}

function sampleIrnRequest() {
  const { IrnGenerateRequest } = {} as { IrnGenerateRequest: never }; // type-only
  return {
    invoiceNumber: "INV-2025-001",
    invoiceDate: "01/01/2025",
    invoiceType: "INV" as const,
    supplierGstin: "29AABCU9603R1ZM",
    supplierLegalName: "Test Supplier Pvt Ltd",
    supplierAddress: "123 Main Street, Bangalore",
    supplierStateCode: "29",
    supplierPincode: "560001",
    buyerGstin: "27AABCU9603R1ZN",
    buyerLegalName: "Test Buyer Pvt Ltd",
    buyerAddress: "456 Market Road, Mumbai",
    buyerStateCode: "27",
    buyerPincode: "400001",
    totalAmount: 11800,
    totalTaxableAmount: 10000,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 1800,
    totalCess: 0,
    lineItems: [
      {
        slNo: 1,
        productDescription: "Software License",
        hsnCode: "998314",
        quantity: 1,
        unit: "NOS",
        unitPrice: 10000,
        totalAmount: 10000,
        taxableAmount: 10000,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 1800,
        cessAmount: 0,
      },
    ],
    reverseCharge: false,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("irp-client", () => {
  describe("getBaseUrl", () => {
    it("returns sandbox URL when IRP_MODE=sandbox", async () => {
      vi.stubEnv("IRP_MODE", "sandbox");
      const { getBaseUrl } = await import("../irp-client");
      expect(getBaseUrl()).toBe("https://einv-apisandbox.nic.in");
    });

    it("returns production URL when IRP_MODE=production", async () => {
      vi.stubEnv("IRP_MODE", "production");
      const { getBaseUrl } = await import("../irp-client");
      expect(getBaseUrl()).toBe("https://einvoice1.gst.gov.in/eicore/v1.03");
    });
  });

  describe("IRP_ERROR_MAP", () => {
    it("has user-friendly messages for all known error codes", async () => {
      const { IRP_ERROR_MAP } = await import("../irp-client");

      const expectedCodes = [
        "2150", "2283", "2163", "2165", "2166", "2167", "2168",
        "2170", "2171", "2250", "2260", "AUTH001", "GEN_ERR",
      ];

      for (const code of expectedCodes) {
        expect(IRP_ERROR_MAP[code]).toBeDefined();
        expect(IRP_ERROR_MAP[code].length).toBeGreaterThan(10);
      }
    });

    it("GEN_ERR provides a generic fallback message", async () => {
      const { IRP_ERROR_MAP } = await import("../irp-client");
      expect(IRP_ERROR_MAP["GEN_ERR"]).toContain("unexpected");
    });
  });

  describe("buildIrpPayload", () => {
    it("creates correct NIC format payload", async () => {
      const { buildIrpPayload } = await import("../irp-client");
      const req = sampleIrnRequest();
      const payload = buildIrpPayload(req) as Record<string, any>;

      expect(payload.Version).toBe("1.1");
      expect(payload.TranDtls.TaxSch).toBe("GST");
      expect(payload.TranDtls.SupTyp).toBe("B2B");
      expect(payload.TranDtls.RegRev).toBe("N");

      expect(payload.DocDtls.Typ).toBe("INV");
      expect(payload.DocDtls.No).toBe("INV-2025-001");
      expect(payload.DocDtls.Dt).toBe("01/01/2025");

      expect(payload.SellerDtls.Gstin).toBe("29AABCU9603R1ZM");
      expect(payload.SellerDtls.LglNm).toBe("Test Supplier Pvt Ltd");
      expect(payload.SellerDtls.Pin).toBe(560001);
      expect(payload.SellerDtls.Stcd).toBe("29");

      expect(payload.BuyerDtls.Gstin).toBe("27AABCU9603R1ZN");
      expect(payload.BuyerDtls.Pos).toBe("27");

      expect(payload.ItemList).toHaveLength(1);
      expect(payload.ItemList[0].HsnCd).toBe("998314");
      expect(payload.ItemList[0].IsServc).toBe("Y"); // HSN starting with 99 = service
      expect(payload.ItemList[0].GstRt).toBe(18);

      expect(payload.ValDtls.AssVal).toBe(10000);
      expect(payload.ValDtls.IgstVal).toBe(1800);
      expect(payload.ValDtls.TotInvVal).toBe(11800);
    });

    it("sets reverse charge fields when reverseCharge is true", async () => {
      const { buildIrpPayload } = await import("../irp-client");
      const req = { ...sampleIrnRequest(), reverseCharge: true };
      const payload = buildIrpPayload(req) as Record<string, any>;

      expect(payload.TranDtls.SupTyp).toBe("SEZWP");
      expect(payload.TranDtls.RegRev).toBe("Y");
    });

    it("marks goods items (non-99 HSN) as IsServc=N", async () => {
      const { buildIrpPayload } = await import("../irp-client");
      const req = sampleIrnRequest();
      req.lineItems[0].hsnCode = "84713010"; // goods
      const payload = buildIrpPayload(req) as Record<string, any>;

      expect(payload.ItemList[0].IsServc).toBe("N");
    });
  });

  describe("generateIrn", () => {
    it("returns IRN on successful generation", async () => {
      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(mockIrnGenerateResponse());

      const { generateIrn } = await import("../irp-client");
      const result = await generateIrn(sampleIrnRequest());

      expect(result.success).toBe(true);
      expect(result.irn).toBe("abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678");
      expect(result.ackNo).toBe("123456789");
      expect(result.ackDate).toBe("01/01/2025 10:00:00");
      expect(result.signedInvoice).toBe("signed-jwt-data");
      expect(result.signedQrCode).toBe("signed-qr-data");
    });

    it("fetches existing IRN on duplicate error 2150", async () => {
      // Auth response
      mockFetch.mockResolvedValueOnce(mockAuthResponse());

      // Generate returns 2150 duplicate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ErrorCode: "2150",
          ErrorMessage: "Duplicate IRN",
        }),
      });

      // Fetch existing IRN call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          Data: {
            Irn: "existing-irn-12345",
            AckNo: 987654,
            AckDt: "31/12/2024",
            SignedQRCode: "existing-qr",
          },
        }),
      });

      const { generateIrn } = await import("../irp-client");
      const result = await generateIrn(sampleIrnRequest());

      expect(result.success).toBe(true);
      expect(result.irn).toBe("existing-irn-12345");

      // Verify the third call was a GET to fetch existing IRN
      const thirdCall = mockFetch.mock.calls[2];
      expect(thirdCall[0]).toContain("GetIRNByDocDtls");
      expect(thirdCall[1].method).toBe("GET");
    });

    it("returns error for non-duplicate IRP errors", async () => {
      mockFetch.mockResolvedValueOnce(mockAuthResponse());
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          ErrorCode: "2283",
          ErrorMessage: "Invalid HSN code",
        }),
      });

      const { generateIrn } = await import("../irp-client");
      const result = await generateIrn(sampleIrnRequest());

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("2283");
      expect(result.error?.userMessage).toContain("Invalid HSN");
    });
  });

  describe("session management", () => {
    it("uses cached token when still valid", async () => {
      // First call: auth + generate
      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(mockIrnGenerateResponse())
        // Second call: only generate (token cached)
        .mockResolvedValueOnce(mockIrnGenerateResponse());

      const { generateIrn } = await import("../irp-client");

      await generateIrn(sampleIrnRequest());
      await generateIrn(sampleIrnRequest());

      // Auth should only be called once (first call), not twice
      // Total calls: 1 auth + 1 generate + 1 generate = 3
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // First call should be to auth endpoint
      expect(mockFetch.mock.calls[0][0]).toContain("/auth/token");
      // Second and third calls should be to generate endpoint
      expect(mockFetch.mock.calls[1][0]).toContain("/eicore/dec/v1.03");
      expect(mockFetch.mock.calls[2][0]).toContain("/eicore/dec/v1.03");
    });

    it("throws when credentials are missing", async () => {
      vi.stubEnv("IRP_CLIENT_ID", "");
      vi.stubEnv("IRP_CLIENT_SECRET", "");

      const { getIrpSession } = await import("../irp-client");
      await expect(getIrpSession()).rejects.toThrow("IRP credentials not configured");
    });
  });

  describe("cancelIrn", () => {
    it("returns success on cancellation", async () => {
      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ Status: 1 }),
        });

      const { cancelIrn } = await import("../irp-client");
      const result = await cancelIrn("test-irn", "1", "Duplicate entry", "29AABCU9603R1ZM");

      expect(result.success).toBe(true);
      expect(result.irn).toBe("test-irn");
    });
  });
});
