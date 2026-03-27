import { voucherDefaultValues } from "@/features/voucher/constants";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";

const exportVoucherDocumentMock = vi.fn();

vi.mock("@/features/voucher/server/export-voucher", () => ({
  exportVoucherDocument: exportVoucherDocumentMock,
}));

describe("POST /api/export/pdf", () => {
  beforeEach(() => {
    exportVoucherDocumentMock.mockReset();
  });

  it("returns a PDF attachment for a valid voucher export request", async () => {
    const { POST } = await import("@/app/api/export/pdf/route");
    const document = normalizeVoucher(voucherDefaultValues);

    exportVoucherDocumentMock.mockResolvedValue(
      new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
    );

    const response = await POST(
      new Request("http://localhost:3000/api/export/pdf", {
        method: "POST",
        body: JSON.stringify({ document }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      'attachment; filename="voucher-pv-2026-014.pdf"',
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    );
  });

  it("returns 400 for an invalid voucher export payload", async () => {
    const { POST } = await import("@/app/api/export/pdf/route");

    const response = await POST(
      new Request("http://localhost:3000/api/export/pdf", {
        method: "POST",
        body: JSON.stringify({ document: { voucherNumber: "" } }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(exportVoucherDocumentMock).not.toHaveBeenCalled();
  });

  it("returns a controlled 500 when PDF rendering fails", async () => {
    const { POST } = await import("@/app/api/export/pdf/route");
    const document = normalizeVoucher(voucherDefaultValues);

    exportVoucherDocumentMock.mockRejectedValue(new Error("renderer failed"));

    const response = await POST(
      new Request("http://localhost:3000/api/export/pdf", {
        method: "POST",
        body: JSON.stringify({ document }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Voucher PDF export failed.",
    });
  });
});
