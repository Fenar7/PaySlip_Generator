import "server-only";

import mammoth from "mammoth";
import pptxgen from "pptxgenjs";
import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import * as XLSX from "xlsx";
import puppeteer from "puppeteer";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type {
  PdfStudioConversionJsonObject,
  PdfStudioServerConversionToolId,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";

type ExtractedPdfText = {
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
};

function isPrivatePdfConversionHostname(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (
    normalized.startsWith("10.") ||
    normalized.startsWith("127.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("192.168.")
  ) {
    return true;
  }

  const ipv6Prefixes = ["fc", "fd", "fe80"];
  if (ipv6Prefixes.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  const ipv4Match = normalized.match(/^172\.(\d{1,3})\./);
  if (ipv4Match) {
    const secondOctet = Number(ipv4Match[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

export function isAllowedHtmlToPdfUrl(input: string) {
  const parsed = new URL(input);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  return !isPrivatePdfConversionHostname(parsed.hostname);
}

async function readStorageBytes(storageKey: string) {
  const supabase = await createSupabaseAdmin();
  const { data, error } = await supabase.storage.from("attachments").download(storageKey);
  if (error || !data) {
    throw new Error("Could not read the queued source file from storage.");
  }
  return new Uint8Array(await data.arrayBuffer());
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
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      pages.push({ pageNumber, text });
      page.cleanup();
    }
    await pdf.destroy();

    return { pageCount: pages.length, pages };
  } catch (error) {
    throw new Error(
      "Password-protected or malformed PDFs cannot be converted to Office outputs yet. Unlock the PDF first, then retry the conversion.",
    );
  }
}

async function convertPdfToWord(pdfBytes: Uint8Array) {
  const extracted = await extractPdfTextServer(pdfBytes);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: extracted.pages.flatMap((page) => [
          new Paragraph({
            text: `Page ${page.pageNumber}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: page.text || "No text found on this page." }),
        ]),
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
    const rows = page.text
      .split(/\n+/)
      .map((line) => [line.trim()])
      .filter(([line]) => line.length > 0);
    const sheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [["No text found on this page."]]);
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

  extracted.pages.forEach((page) => {
    const slide = pptx.addSlide();
    slide.addText(`Page ${page.pageNumber}`, {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.5,
      fontSize: 20,
      bold: true,
    });
    slide.addText(page.text || "No text found on this page.", {
      x: 0.5,
      y: 1,
      w: 12.3,
      h: 5.8,
      fontSize: 12,
      valign: "top",
      margin: 0.1,
    });
  });

  return {
    bytes: new Uint8Array(await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer),
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

async function renderHtmlToPdfBuffer(params: {
  html?: string;
  url?: string;
  pageSize?: string;
  margin?: string;
  preferPrintCss?: boolean;
}) {
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const requestUrl = request.url();
      if (requestUrl.startsWith("data:") || requestUrl.startsWith("about:")) {
        void request.continue();
        return;
      }

      try {
        if (!isAllowedHtmlToPdfUrl(requestUrl)) {
          void request.abort("blockedbyclient");
          return;
        }
      } catch {
        void request.abort("blockedbyclient");
        return;
      }

      void request.continue();
    });

    if (params.url) {
      if (!isAllowedHtmlToPdfUrl(params.url)) {
        throw new Error(
          "Only public http:// or https:// URLs are supported for HTML to PDF.",
        );
      }
      await page.goto(params.url, { waitUntil: "networkidle0", timeout: 45_000 });
    } else if (params.html) {
      await page.setContent(params.html, { waitUntil: "networkidle0" });
    } else {
      throw new Error("Missing HTML input.");
    }

    return new Uint8Array(
      await page.pdf({
        format: (params.pageSize as "A4" | "Letter" | "Legal") || "A4",
        margin: { top: params.margin || "12mm", right: params.margin || "12mm", bottom: params.margin || "12mm", left: params.margin || "12mm" },
        printBackground: true,
        preferCSSPageSize: params.preferPrintCss ?? true,
      }),
    );
  } finally {
    await browser.close();
  }
}

async function convertWordToPdf(sourceBytes: Uint8Array, options?: PdfStudioConversionJsonObject) {
  const html = await mammoth.convertToHtml({
    buffer: Buffer.from(sourceBytes),
  });
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
  const html =
    params.sourceBytes != null
      ? Buffer.from(params.sourceBytes).toString("utf8")
      : undefined;
  const pdfBytes = await renderHtmlToPdfBuffer({
    html,
    url: params.sourceUrl,
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
      if (!sourceBytes) throw new Error("Missing PDF source file.");
      return convertPdfToWord(sourceBytes);
    case "pdf-to-excel":
      if (!sourceBytes) throw new Error("Missing PDF source file.");
      return convertPdfToExcel(sourceBytes);
    case "pdf-to-ppt":
      if (!sourceBytes) throw new Error("Missing PDF source file.");
      return convertPdfToPpt(sourceBytes);
    case "word-to-pdf":
      if (!sourceBytes) throw new Error("Missing DOCX source file.");
      return convertWordToPdf(sourceBytes, params.options);
    case "html-to-pdf":
      return convertHtmlToPdf({
        sourceBytes,
        sourceUrl: params.sourceUrl,
        options: params.options,
      });
  }
}
