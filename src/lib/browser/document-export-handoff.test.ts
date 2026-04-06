import {
  prepareDocumentExportDownload,
  startDocumentExportDownload,
} from "@/lib/browser/document-export-handoff";

describe("document export handoff", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a browser download from the prepared session url", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          pdfUrl: "/api/export/invoice/download?payload=test&format=pdf",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const url = await prepareDocumentExportDownload({
      sessionEndpoint: "/api/export/invoice/session",
      payload: JSON.stringify({ document: { id: "inv-1" } }),
      format: "pdf",
      fallbackErrorMessage: "Unable to prepare the invoice export.",
    });

    expect(url).toBe("/api/export/invoice/download?payload=test&format=pdf");
    expect(fetch).toHaveBeenCalledWith("/api/export/invoice/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: { id: "inv-1" } }),
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("surfaces session errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Invoice export session expired.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      prepareDocumentExportDownload({
        sessionEndpoint: "/api/export/invoice/session",
        payload: JSON.stringify({ document: { id: "inv-1" } }),
        format: "pdf",
        fallbackErrorMessage: "Unable to prepare the invoice export.",
      }),
    ).rejects.toThrow("Invoice export session expired.");
  });

  it("can restart the same prepared download url", () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    startDocumentExportDownload("/api/export/download?payload=test&format=pdf");

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
