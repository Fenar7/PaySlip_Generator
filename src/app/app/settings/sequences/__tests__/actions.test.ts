import { describe, expect, it, vi } from "vitest";

const mockGetSequenceConfig = vi.fn();
const mockUpdateSequenceSettingsAtomic = vi.fn();
const mockPreviewSequenceNumber = vi.fn();
const mockGetSequenceAuditHistory = vi.fn();
const mockPreviewResequencePreview = vi.fn();
const mockApplyResequencePreview = vi.fn();
const mockConfigureInitialSequences = vi.fn();
const mockGetDefaultSequenceConfig = vi.fn();

vi.mock("@/features/sequences/services/sequence-admin", () => ({
  getSequenceConfig: (...args: unknown[]) => mockGetSequenceConfig(...args),
  updateSequenceSettingsAtomic: (...args: unknown[]) => mockUpdateSequenceSettingsAtomic(...args),
  getSequenceAuditHistory: (...args: unknown[]) => mockGetSequenceAuditHistory(...args),
  previewResequencePreview: (...args: unknown[]) => mockPreviewResequencePreview(...args),
  applyResequencePreview: (...args: unknown[]) => mockApplyResequencePreview(...args),
}));

vi.mock("@/features/sequences/services/sequence-engine", () => ({
  previewSequenceNumber: (...args: unknown[]) => mockPreviewSequenceNumber(...args),
}));

vi.mock("@/app/onboarding/actions", () => ({
  configureInitialSequences: (...args: unknown[]) => mockConfigureInitialSequences(...args),
  getDefaultSequenceConfig: (...args: unknown[]) => mockGetDefaultSequenceConfig(...args),
}));

import { getSequenceSettings, initializeSequenceSettings, updateSequenceSettings, getSequenceHistory, previewResequence, applyResequence } from "../actions";

describe("sequence settings actions", () => {
  it("returns null sequences when none exist", async () => {
    mockGetSequenceConfig.mockResolvedValue(null);
    const result = await getSequenceSettings("org-1");
    expect(result.invoice).toBeNull();
    expect(result.voucher).toBeNull();
  });

  it("returns settings with previews", async () => {
    mockGetSequenceConfig.mockImplementation(({ documentType }: { documentType: string }) => {
      if (documentType === "INVOICE") return Promise.resolve({ sequenceId: "seq-inv", name: "Invoice Sequence", periodicity: "YEARLY", isActive: true, formatString: "INV/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5, currentCounter: 42 });
      return Promise.resolve({ sequenceId: "seq-vch", name: "Voucher Sequence", periodicity: "MONTHLY", isActive: true, formatString: "VCH/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5, currentCounter: 10 });
    });
    mockPreviewSequenceNumber.mockResolvedValue({ preview: "INV/2026/00043" });
    const result = await getSequenceSettings("org-1");
    expect(result.invoice?.formatString).toBe("INV/{YYYY}/{NNNNN}");
    expect(result.invoice?.nextPreview).toBe("INV/2026/00043");
  });

  it("updateSequenceSettings delegates atomically", async () => {
    mockUpdateSequenceSettingsAtomic.mockResolvedValue({ success: true });
    const result = await updateSequenceSettings("org-1", { documentType: "INVOICE", formatString: "REC/{YYYY}/{NNNNN}", periodicity: "MONTHLY" });
    expect(result.success).toBe(true);
  });

  it("initializeSequenceSettings uses explicit custom config when provided", async () => {
    mockConfigureInitialSequences.mockResolvedValue({ success: true, created: ["INVOICE"] });

    const result = await initializeSequenceSettings("org-1", {
      documentType: "INVOICE",
      formatString: "REC/{YYYY}/{NNNNN}",
      periodicity: "YEARLY",
      latestUsedNumber: "REC/2026/00042",
    });

    expect(result.success).toBe(true);
    expect(mockConfigureInitialSequences).toHaveBeenCalledWith({
      organizationId: "org-1",
      customConfigs: [
        {
          documentType: "INVOICE",
          formatString: "REC/{YYYY}/{NNNNN}",
          periodicity: "YEARLY",
          latestUsedNumber: "REC/2026/00042",
        },
      ],
      markOnboardingComplete: false,
    });
  });

  it("initializeSequenceSettings uses the recommended default when no custom config is supplied", async () => {
    mockGetDefaultSequenceConfig.mockReturnValue({
      documentType: "VOUCHER",
      formatString: "VCH/{YYYY}/{NNNNN}",
      periodicity: "YEARLY",
      startCounter: 1,
      counterPadding: 5,
    });
    mockConfigureInitialSequences.mockResolvedValue({ success: true, created: ["VOUCHER"] });

    const result = await initializeSequenceSettings("org-1", {
      documentType: "VOUCHER",
    });

    expect(result.success).toBe(true);
    expect(mockConfigureInitialSequences).toHaveBeenLastCalledWith({
      organizationId: "org-1",
      customConfigs: [
        {
          documentType: "VOUCHER",
          name: "Default Voucher Sequence",
          formatString: "VCH/{YYYY}/{NNNNN}",
          periodicity: "YEARLY",
          startCounter: 1,
          counterPadding: 5,
          latestUsedNumber: undefined,
        },
      ],
      markOnboardingComplete: false,
    });
  });

  it("getSequenceHistory filters by documentType", async () => {
    mockGetSequenceAuditHistory.mockResolvedValue({ logs: [], total: 0 });
    await getSequenceHistory("org-1", "INVOICE");
    expect(mockGetSequenceAuditHistory).toHaveBeenCalledWith({ orgId: "org-1", documentType: "INVOICE", limit: 50, offset: 0 });
  });

  it("previewResequence delegates to admin", async () => {
    mockPreviewResequencePreview.mockResolvedValue({ summary: { totalDocuments: 3, unchanged: 0, renumbered: 3, blocked: 0 }, mappings: [], sequenceId: "seq-1", formatString: "INV/{YYYY}/{NNNNN}", periodicity: "YEARLY", previewFingerprint: "abc" });
    const result = await previewResequence({ orgId: "org-1", documentType: "INVOICE", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), orderBy: "document_date" });
    expect(result.summary.renumbered).toBe(3);
  });

  it("previewResequence rejects invalid dates", async () => {
    await expect(previewResequence({ orgId: "org-1", documentType: "INVOICE", startDate: new Date("2026-12-31"), endDate: new Date("2026-01-01"), orderBy: "document_date" })).rejects.toThrow();
  });

  it("applyResequence delegates to admin", async () => {
    mockApplyResequencePreview.mockResolvedValue({ summary: { totalConsidered: 3, applied: 2, unchanged: 1, blocked: 0, failed: 0 }, appliedDocumentIds: ["inv-1"], preview: { summary: { totalDocuments: 3, unchanged: 1, renumbered: 2, blocked: 0 }, mappings: [], sequenceId: "seq-1", formatString: "INV/{YYYY}/{NNNNN}", periodicity: "YEARLY", previewFingerprint: "abc" } });
    const result = await applyResequence({ orgId: "org-1", documentType: "INVOICE", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), orderBy: "document_date", expectedFingerprint: "abc" });
    expect(result.summary.applied).toBe(2);
  });

  it("applyResequence rejects invalid dates", async () => {
    await expect(applyResequence({ orgId: "org-1", documentType: "INVOICE", startDate: new Date("2026-12-31"), endDate: new Date("2026-01-01"), orderBy: "document_date", expectedFingerprint: "abc" })).rejects.toThrow();
  });
});
