import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validatePdfStudioConversionRequest } from "@/features/docs/pdf-studio/lib/server-conversion-policy";

async function buildDocxFile(extraEntries?: Record<string, string>) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body>
      </w:document>`,
  );

  for (const [path, content] of Object.entries(extraEntries ?? {})) {
    zip.file(path, content);
  }

  return new File([await zip.generateAsync({ type: "uint8array" })], "offer.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("server conversion policy", () => {
  it("rejects remote URL mode for HTML to PDF", async () => {
    await expect(
      validatePdfStudioConversionRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
        sourceUrl: "https://example.com/report",
      }),
    ).rejects.toThrow("Remote URL rendering is disabled");
  });

  it("rejects fake PDF uploads before queueing the job", async () => {
    const fakePdf = new File(["<html>not a pdf</html>"], "report.pdf", {
      type: "application/pdf",
    });

    await expect(
      validatePdfStudioConversionRequest({
        toolId: "pdf-to-word",
        targetFormat: "docx",
        sourceFile: fakePdf,
      }),
    ).rejects.toThrow("only accepts real PDF files");
  });

  it("rejects macro-enabled DOCX uploads", async () => {
    const docxWithMacro = await buildDocxFile({
      "word/vbaProject.bin": "macro-binary",
    });

    await expect(
      validatePdfStudioConversionRequest({
        toolId: "word-to-pdf",
        targetFormat: "pdf",
        sourceFile: docxWithMacro,
      }),
    ).rejects.toThrow("Macro-enabled Word documents are not supported");
  });

  it("rejects HTML files with external assets", async () => {
    const html = new File(
      [
        `<!doctype html><html><body><img src="https://example.com/logo.png" /></body></html>`,
      ],
      "report.html",
      { type: "text/html" },
    );

    await expect(
      validatePdfStudioConversionRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
        sourceFile: html,
      }),
    ).rejects.toThrow("self-contained HTML files");
  });

  it("accepts standard DOCX uploads with normalized options", async () => {
    const docx = await buildDocxFile();

    await expect(
      validatePdfStudioConversionRequest({
        toolId: "word-to-pdf",
        targetFormat: "pdf",
        sourceFile: docx,
        options: {
          pageSize: "Letter",
          margin: "12mm",
          preferPrintCss: true,
        },
      }),
    ).resolves.toMatchObject({
      sourceFile: docx,
      options: {
        pageSize: "Letter",
        margin: "12mm",
        preferPrintCss: true,
      },
    });
  });
});
