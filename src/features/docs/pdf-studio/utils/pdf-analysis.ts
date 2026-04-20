"use client";

export type PdfBookmarkBoundary = {
  title: string;
  pageNumber: number;
  level: number;
};

export type PdfSeparatorCandidate = {
  pageNumber: number;
  heading: string;
  reason: string;
  wordCount: number;
};

export type PdfSplitAnalysis = {
  bookmarks: PdfBookmarkBoundary[];
  separatorCandidates: PdfSeparatorCandidate[];
  estimatedPageBytes: number[];
  averagePageBytes: number;
};

type PdfDocumentProxy = Awaited<ReturnType<typeof loadPdfDocument>>;
type PdfOutlineItem = {
  title?: string | null;
  dest?: string | readonly unknown[] | null;
  items?: PdfOutlineItem[];
};

function isDestinationRef(value: unknown): value is { num: number; gen: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "num" in value &&
    typeof value.num === "number" &&
    "gen" in value &&
    typeof value.gen === "number"
  );
}

async function loadPdfDocument(pdfBytes: Uint8Array) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  return pdfjsLib.getDocument({ data: pdfBytes }).promise;
}

async function resolveDestinationPageNumber(
  pdfDocument: PdfDocumentProxy,
  destination: PdfOutlineItem["dest"],
) {
  let resolvedDestination = destination;
  if (typeof destination === "string") {
    resolvedDestination = await pdfDocument.getDestination(destination);
  }

  if (!Array.isArray(resolvedDestination) || resolvedDestination.length === 0) {
    return null;
  }

  const reference = resolvedDestination[0];
  if (!isDestinationRef(reference)) {
    return null;
  }

  try {
    return (await pdfDocument.getPageIndex(reference)) + 1;
  } catch {
    return null;
  }
}

async function flattenBookmarks(
  pdfDocument: PdfDocumentProxy,
  outline: PdfOutlineItem[],
  level = 0,
): Promise<PdfBookmarkBoundary[]> {
  const bookmarks: PdfBookmarkBoundary[] = [];

  for (const item of outline) {
    const pageNumber = await resolveDestinationPageNumber(pdfDocument, item.dest ?? null);
    const title = item.title?.trim();
    if (pageNumber && title) {
      bookmarks.push({
        title,
        pageNumber,
        level,
      });
    }

    if (item.items?.length) {
      bookmarks.push(...(await flattenBookmarks(pdfDocument, item.items, level + 1)));
    }
  }

  return bookmarks;
}

async function getNormalizedPageText(pdfDocument: PdfDocumentProxy, pageNumber: number) {
  const page = await pdfDocument.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const text = textContent.items
    .map((item) => {
      if ("str" in item && typeof item.str === "string") {
        return item.str;
      }
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();

  return text;
}

function detectSeparatorCandidate(pageNumber: number, text: string): PdfSeparatorCandidate | null {
  if (!text) {
    return null;
  }

  const words = text.split(/\s+/u).filter(Boolean);
  const heading = words.slice(0, 8).join(" ");
  const leadingWindow = text.slice(0, 160);
  const keywordMatch = leadingWindow.match(
    /\b(invoice|statement|summary|report|section|chapter|appendix|separator|divider|batch|document)\b/iu,
  );
  const letters = leadingWindow.replace(/[^a-z]/giu, "");
  const uppercaseLetters = leadingWindow.replace(/[^A-Z]/gu, "");
  const uppercaseRatio = letters.length === 0 ? 0 : uppercaseLetters.length / letters.length;
  const isShortHeading = words.length > 0 && words.length <= 18 && uppercaseRatio >= 0.55;

  if (!keywordMatch && !isShortHeading) {
    return null;
  }

  return {
    pageNumber,
    heading: heading || `Page ${pageNumber}`,
    reason: keywordMatch
      ? `Detected "${keywordMatch[1]}" in the opening text.`
      : "Detected a short heading-style opening page.",
    wordCount: words.length,
  };
}

export async function analyzePdfForSplit(pdfBytes: Uint8Array): Promise<PdfSplitAnalysis> {
  const pdfDocument = await loadPdfDocument(pdfBytes);
  const totalPages = pdfDocument.numPages;
  const averagePageBytes = Math.max(1, Math.round(pdfBytes.byteLength / totalPages));
  const estimatedPageBytes = Array.from({ length: totalPages }, () => averagePageBytes);

  const outline = ((await pdfDocument.getOutline()) ?? []) as PdfOutlineItem[];
  const rawBookmarks = await flattenBookmarks(pdfDocument, outline);
  const bookmarkPageMap = new Map<number, PdfBookmarkBoundary>();
  for (const bookmark of rawBookmarks) {
    if (bookmark.pageNumber > 1 && !bookmarkPageMap.has(bookmark.pageNumber)) {
      bookmarkPageMap.set(bookmark.pageNumber, bookmark);
    }
  }

  const separatorCandidates: PdfSeparatorCandidate[] = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const text = await getNormalizedPageText(pdfDocument, pageNumber);
    const candidate = detectSeparatorCandidate(pageNumber, text);
    if (candidate && pageNumber > 1) {
      separatorCandidates.push(candidate);
    }
  }

  return {
    bookmarks: Array.from(bookmarkPageMap.values()).sort(
      (left, right) => left.pageNumber - right.pageNumber,
    ),
    separatorCandidates,
    estimatedPageBytes,
    averagePageBytes,
  };
}
