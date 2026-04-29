import { describe, expect, it, vi } from "vitest";

const mockGetSequenceConfig = vi.fn();
const mockUpdateSequenceFormat = vi.fn();
const mockUpdateSequencePeriodicity = vi.fn();
const mockPreviewSequenceNumber = vi.fn();
const mockGetSequenceAuditHistory = vi.fn();

vi.mock("@/features/sequences/services/sequence-admin", () => ({
  getSequenceConfig: (...args: unknown[]) => mockGetSequenceConfig(...args),
  updateSequenceFormat: (...args: unknown[]) => mockUpdateSequenceFormat(...args),
  updateSequencePeriodicity: (...args: unknown[]) => mockUpdateSequencePeriodicity(...args),
  getSequenceAuditHistory: (...args: unknown[]) => mockGetSequenceAuditHistory(...args),
}));

vi.mock("@/features/sequences/services/sequence-engine", () => ({
  previewSequenceNumber: (...args: unknown[]) => mockPreviewSequenceNumber(...args),
}));

import { getSequenceSettings, updateSequenceSettings, getSequenceHistory } from "../actions";

describe("sequence settings actions", () => {
  it("returns null sequences when none exist", async () => {
    mockGetSequenceConfig.mockResolvedValue(null);
    const result = await getSequenceSettings("org-1");
    expect(result.invoice).toBeNull();
    expect(result.voucher).toBeNull();
  });

  it("returns settings with previews", async () => {
    mockGetSequenceConfig.mockImplementation(({ documentType }: { documentType: string }) => {
      if (documentType === "INVOICE") {
        return Promise.resolve({
          sequenceId: "seq-inv",
          name: "Invoice Sequence",
          periodicity: "YEARLY",
          isActive: true,
          formatString: "INV/{YYYY}/{NNNNN}",
          startCounter: 1,
          counterPadding: 5,
          currentCounter: 42,
        });
      }
      return Promise.resolve({
        sequenceId: "seq-vch",
        name: "Voucher Sequence",
        periodicity: "MONTHLY",
        isActive: true,
        formatString: "VCH/{YYYY}/{NNNNN}",
        startCounter: 1,
        counterPadding: 5,
        currentCounter: 10,
      });
    });

    mockPreviewSequenceNumber.mockResolvedValue({ preview: "INV/2026/00043" });

    const result = await getSequenceSettings("org-1");
    expect(result.invoice?.formatString).toBe("INV/{YYYY}/{NNNNN}");
    expect(result.invoice?.nextPreview).toBe("INV/2026/00043");
    expect(result.voucher?.periodicity).toBe("MONTHLY");
  });

  it("updateSequenceSettings calls format and periodicity updates", async () => {
    mockUpdateSequenceFormat.mockResolvedValue({ success: true });
    mockUpdateSequencePeriodicity.mockResolvedValue({ success: true });

    const result = await updateSequenceSettings("org-1", {
      documentType: "INVOICE",
      formatString: "REC/{YYYY}/{NNNNN}",
      periodicity: "MONTHLY",
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSequenceFormat).toHaveBeenCalledWith({
      orgId: "org-1",
      documentType: "INVOICE",
      formatString: "REC/{YYYY}/{NNNNN}",
    });
    expect(mockUpdateSequencePeriodicity).toHaveBeenCalledWith({
      orgId: "org-1",
      documentType: "INVOICE",
      periodicity: "MONTHLY",
    });
  });

  it("getSequenceHistory passes documentType to audit history when provided", async () => {
    mockGetSequenceAuditHistory.mockResolvedValue({
      logs: [{ id: "log-1", action: "sequence.edited" }],
      total: 1,
    });

    const result = await getSequenceHistory("org-1", "INVOICE");

    expect(mockGetSequenceAuditHistory).toHaveBeenCalledWith({
      orgId: "org-1",
      documentType: "INVOICE",
      limit: 50,
      offset: 0,
    });
    expect(result.logs).toHaveLength(1);
  });

  it("getSequenceHistory omits documentType when not provided", async () => {
    mockGetSequenceAuditHistory.mockResolvedValue({
      logs: [{ id: "log-1", action: "sequence.edited" }],
      total: 1,
    });

    const result = await getSequenceHistory("org-1");

    expect(mockGetSequenceAuditHistory).toHaveBeenCalledWith({
      orgId: "org-1",
      limit: 50,
      offset: 0,
    });
    expect(result.logs).toHaveLength(1);
  });
});
