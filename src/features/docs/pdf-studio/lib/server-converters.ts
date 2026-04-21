import "server-only";

import mammoth from "mammoth";
import pptxgen from "pptxgenjs";
import {
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";
import * as XLSX from "xlsx";
import puppeteer from "puppeteer";
import type {
  PdfStudioConversionJsonObject,
  PdfStudioServerConversionToolId,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { PdfStudioConversionError } from "@/features/docs/pdf-studio/lib/conversion-errors";
import {
  buildPdfLayoutBlocks,
  buildWorksheetRowsFromBlocks,
  groupPdfTextTokensIntoLines,
  type PdfTextLine,
  type PdfTextToken,
} from "@/features/docs/pdf-studio/lib/pdf-text-layout";
import {
  PDF_STUDIO_HTML_MAX_DOM_NODES,
  PDF_STUDIO_HTML_MAX_TEXT_LENGTH,
  PDF_STUDIO_HTML_RENDER_TIMEOUT_MS,
} from "@/features/docs/pdf-studio/lib/server-conversion-policy";
import { downloadFileServer } from "@/lib/storage/upload-server";

type ExtractedPdfText = {
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    width: number;
    height: number;
    lines: PdfTextLine[];
  }>;
};

const PUPPETEER_ARGS = ["--disable-dev-shm-usage"];

async function readStorageBytes(storageKey: string) {
  try {
    return await downloadFileServer("attachments", storageKey, { useAdmin: true });
  } catch {
    throw new PdfStudioConversionError({
      code: "storage_error",
      message: "Could not read the queued source file from storage.",
      status: 500,
      retryable: true,
    });
  }
}

function toPdfExtractionError(error: unknown): never {
  if (error instanceof Error && error.name === "PasswordException") {
    throw new PdfStudioConversionError({
      code: "password_protected",
      message: "This PDF is password-protected. Unlock it first, then retry the conversion.",
      status: 422,
    });
  }

  throw new PdfStudioConversionError({
    code: "malformed_pdf",
    message: "This PDF is malformed or unsupported. Repair the PDF, then retry the conversion.",
    status: 422,
  });
}

async function extractPdfTextServer(pdfBytes: Uint8Array): Promise<ExtractedPdfText> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjsLib.getDocument({
      data: pdfBytes,
      disableWorker: true,
    }).promise;

    const pages: ExtractedPdfText["pages"] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const tokens = content.items.flatMap((item) => {
        if (!("str" in item) || item.str.trim().length === 0) {
          return [];
        }

        const [scaleX, , , scaleY, x, y] = item.transform;
        const fontSize = Math.max(10, Math.abs(scaleY) || Math.abs(scaleX) || item.height || 10);
        const width = item.width || Math.max(item.str.length * fontSize * 0.5, 8);
        const height = item.height || fontSize;

        return [
          {
            text: item.str.trim(),
            x,
            y,
            top: viewport.height - y - height,
            width,
            height,
            fontSize,
          } satisfies PdfTextToken,
        ];
      });

      const lines = groupPdfTextTokensIntoLines(tokens);
      const text = lines
        .map((line) => line.text)
        .filter((line) => line.length > 0)
        .join("\n")
        .trim();

      pages.push({
        pageNumber,
        text,
        width: viewport.width,
        height: viewport.height,
        lines,
      });
      page.cleanup();
    }

    await pdf.destroy();
    return { pageCount: pages.length, pages };
  } catch (error) {
    toPdfExtractionError(error);
  }
}

function buildDocxPageContent(
  page: ExtractedPdfText["pages"][number],
  addPageBreak: boolean,
) {
  const blocks = buildPdfLayoutBlocks(page.lines);
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      text: `Page ${page.pageNumber}`,
      heading: HeadingLevel.HEADING_2,
    }),
  ];

  for (const block of blocks) {
    if (block.kind === "table") {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [new Paragraph({ text: cell || " " })],
                    }),
                ),
              }),
          ),
        }),
      );
      continue;
    }

    children.push(
      ...block.lines.map(
        (line) =>
          new Paragraph({
            text: line.text || " ",
            indent: {
              left: Math.min(Math.round(line.x * 20), 2_880),
            },
            spacing: {
              after: 120,
            },
          }),
      ),
    );
  }

  if (children.length === 1) {
    children.push(new Paragraph({ text: "No text found on this page." }));
  }

  if (addPageBreak) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    );
  }

  return children;
}

async function convertPdfToWord(pdfBytes: Uint8Array) {
  const extracted = await extractPdfTextServer(pdfBytes);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children:
          extracted.pages.length > 0
            ? extracted.pages.flatMap((page, index) =>
                buildDocxPageContent(page, index < extracted.pages.length - 1),
              )
            : [new Paragraph({ text: "No text found in this PDF." })],
      },
    ],
  });

  return {
    bytes: new Uint8Array(await Packer.toBuffer(doc)),
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

async function convertPdfToExcel(pdfBytes: Uint8Array) {
  const extracted = await extractPdfTextServer(pdfBytes);
  const workbook = XLSX.utils.book_new();

  extracted.pages.forEach((page) => {
    const rows = buildWorksheetRowsFromBlocks(buildPdfLayoutBlocks(page.lines));
    const sheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [["No text found on this page."]]);
    const maxColumns = Math.max(...rows.map((row) => row.length), 1);
    sheet["!cols"] = Array.from({ length: maxColumns }, (_, columnIndex) => ({
      wch: Math.min(
        60,
        Math.max(
          12,
          ...rows.map((row) => (row[columnIndex]?.length ?? 0) + 2),
        ),
      ),
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, `Page ${page.pageNumber}`.slice(0, 31));
  });

  return {
    bytes: XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    }) as Uint8Array,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

async function convertPdfToPpt(pdfBytes: Uint8Array) {
  const extracted = await extractPdfTextServer(pdfBytes);
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  const slideFrame = { x: 0.4, y: 0.35, w: 12.53, h: 6.8 };

  extracted.pages.forEach((page) => {
    const slide = pptx.addSlide();
    const pageWidthInches = page.width / 72;
    const pageHeightInches = page.height / 72;
    const scale = Math.min(slideFrame.w / pageWidthInches, slideFrame.h / pageHeightInches);
    const offsetX = slideFrame.x + (slideFrame.w - pageWidthInches * scale) / 2;
    const offsetY = slideFrame.y + (slideFrame.h - pageHeightInches * scale) / 2;

    slide.addShape(pptx.ShapeType.rect, {
      x: offsetX,
      y: offsetY,
      w: pageWidthInches * scale,
      h: pageHeightInches * scale,
      line: { color: "D4D4D4", width: 1 },
      fill: { color: "FFFFFF" },
    });

    page.lines.forEach((line) => {
      line.cells.forEach((cell) => {
        slide.addText(cell.text, {
          x: offsetX + (cell.x / 72) * scale,
          y: offsetY + (cell.top / 72) * scale,
          w: Math.max(0.25, (cell.width / 72) * scale + 0.05),
          h: Math.max(0.18, (cell.height / 72) * scale + 0.05),
          fontSize: Math.max(8, Math.min(18, cell.fontSize * scale)),
          margin: 0,
          color: "1A1A1A",
          valign: "top",
          fit: "shrink",
        });
      });
    });

    if (page.lines.length === 0) {
      slide.addText("No text found on this page.", {
        x: offsetX + 0.3,
        y: offsetY + 0.3,
        w: 4,
        h: 0.4,
        fontSize: 14,
        color: "666666",
      });
    }
  });

  return {
    bytes: new Uint8Array(await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer),
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  createTimeoutError: () => PdfStudioConversionError,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(createTimeoutError()), timeoutMs);
    void promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function renderHtmlToPdfBuffer(params: {
  html?: string;
  pageSize?: string;
  margin?: string;
  preferPrintCss?: boolean;
}) {
  if (!params.html) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: "Missing HTML input.",
      status: 422,
    });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: PUPPETEER_ARGS,
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(PDF_STUDIO_HTML_RENDER_TIMEOUT_MS);
    page.setDefaultTimeout(PDF_STUDIO_HTML_RENDER_TIMEOUT_MS);
    await page.emulateMediaType("screen");
    await page.setRequestInterception(true);
    let blockedRequests = 0;

    page.on("request", (request) => {
      const requestUrl = request.url();
      if (
        requestUrl.startsWith("data:") ||
        requestUrl.startsWith("about:") ||
        requestUrl.startsWith("blob:")
      ) {
        void request.continue();
        return;
      }

      blockedRequests += 1;
      void request.abort("blockedbyclient");
    });

    await page.setContent(params.html, {
      waitUntil: "networkidle0",
      timeout: PDF_STUDIO_HTML_RENDER_TIMEOUT_MS,
    });

    const pageMetrics = await page.evaluate(() => ({
      nodeCount: document.querySelectorAll("*").length,
      textLength: document.body?.innerText.length ?? 0,
    }));

    if (
      pageMetrics.nodeCount > PDF_STUDIO_HTML_MAX_DOM_NODES ||
      pageMetrics.textLength > PDF_STUDIO_HTML_MAX_TEXT_LENGTH
    ) {
      throw new PdfStudioConversionError({
        code: "html_render_timeout",
        message:
          "This HTML document is too large or complex for reliable PDF rendering. Split it into smaller sections and retry.",
        status: 422,
      });
    }

    if (blockedRequests > 0) {
      throw new PdfStudioConversionError({
        code: "html_asset_blocked",
        message:
          "HTML to PDF blocked external or relative assets. Upload a self-contained HTML file with inline assets only.",
        status: 422,
      });
    }

    return new Uint8Array(
      await withTimeout(
        page.pdf({
          format: (params.pageSize as "A4" | "Letter" | "Legal") || "A4",
          margin: {
            top: params.margin || "12mm",
            right: params.margin || "12mm",
            bottom: params.margin || "12mm",
            left: params.margin || "12mm",
          },
          printBackground: true,
          preferCSSPageSize: params.preferPrintCss ?? true,
        }),
        PDF_STUDIO_HTML_RENDER_TIMEOUT_MS,
        () =>
          new PdfStudioConversionError({
            code: "html_render_timeout",
            message:
              "HTML to PDF timed out while rendering the PDF. Simplify the document and retry.",
            status: 504,
            retryable: false,
          }),
      ),
    );
  } finally {
    await browser.close();
  }
}

async function convertWordToPdf(sourceBytes: Uint8Array, options?: PdfStudioConversionJsonObject) {
  let html;
  try {
    html = await mammoth.convertToHtml({
      buffer: Buffer.from(sourceBytes),
    });
  } catch {
    throw new PdfStudioConversionError({
      code: "malformed_docx",
      message: "The DOCX file could not be rendered. Save it as a standard DOCX and retry.",
      status: 422,
    });
  }

  const pdfBytes = await renderHtmlToPdfBuffer({
    html: html.value,
    pageSize: typeof options?.pageSize === "string" ? options.pageSize : "A4",
    margin: typeof options?.margin === "string" ? options.margin : "12mm",
    preferPrintCss: Boolean(options?.preferPrintCss ?? true),
  });

  return {
    bytes: pdfBytes,
    mimeType: "application/pdf",
  };
}

async function convertHtmlToPdf(params: {
  sourceBytes?: Uint8Array;
  sourceUrl?: string;
  options?: PdfStudioConversionJsonObject;
}) {
  if (params.sourceUrl) {
    throw new PdfStudioConversionError({
      code: "html_remote_disabled",
      message:
        "Remote URL rendering is disabled for HTML to PDF. Upload a self-contained HTML file instead.",
      status: 422,
    });
  }

  const html = params.sourceBytes != null ? Buffer.from(params.sourceBytes).toString("utf8") : undefined;
  const pdfBytes = await renderHtmlToPdfBuffer({
    html,
    pageSize: typeof params.options?.pageSize === "string" ? params.options.pageSize : "A4",
    margin: typeof params.options?.margin === "string" ? params.options.margin : "12mm",
    preferPrintCss: Boolean(params.options?.preferPrintCss ?? true),
  });

  return {
    bytes: pdfBytes,
    mimeType: "application/pdf",
  };
}

export async function runServerConversion(params: {
  toolId: PdfStudioServerConversionToolId;
  sourceStorageKey?: string;
  sourceUrl?: string;
  options?: PdfStudioConversionJsonObject;
}) {
  const sourceBytes = params.sourceStorageKey
    ? await readStorageBytes(params.sourceStorageKey)
    : undefined;

  switch (params.toolId) {
    case "pdf-to-word":
      if (!sourceBytes) {
        throw new PdfStudioConversionError({
          code: "unsupported_input",
          message: "Missing PDF source file.",
          status: 422,
        });
      }
      return convertPdfToWord(sourceBytes);
    case "pdf-to-excel":
      if (!sourceBytes) {
        throw new PdfStudioConversionError({
          code: "unsupported_input",
          message: "Missing PDF source file.",
          status: 422,
        });
      }
      return convertPdfToExcel(sourceBytes);
    case "pdf-to-ppt":
      if (!sourceBytes) {
        throw new PdfStudioConversionError({
          code: "unsupported_input",
          message: "Missing PDF source file.",
          status: 422,
        });
      }
      return convertPdfToPpt(sourceBytes);
    case "word-to-pdf":
      if (!sourceBytes) {
        throw new PdfStudioConversionError({
          code: "unsupported_input",
          message: "Missing DOCX source file.",
          status: 422,
        });
      }
      return convertWordToPdf(sourceBytes, params.options);
    case "html-to-pdf":
      return convertHtmlToPdf({
        sourceBytes,
        sourceUrl: params.sourceUrl,
        options: params.options,
      });
  }
}
