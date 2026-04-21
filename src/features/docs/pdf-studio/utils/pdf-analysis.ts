"use client";

import {
  destroyPdfJsDocument,
  openPdfJsDocument,
} from "@/features/docs/pdf-studio/utils/pdfjs-client";

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

export type PdfSplitAnalysisProgress = {
  processedPages: number;
  totalPages: number;
};

export type PdfSplitAnalysisOptions = {
  previewBytes?: number[];
  onProgress?: (progress: PdfSplitAnalysisProgress) => void;
};

export type PdfTextPageSummary = {
  pageNumber: number;
  heading: string;
  headingKey: string;
  wordCount: number;
  headingWordCount: number;
  remainingWordCount: number;
  uppercaseRatio: number;
  keyword: string | null;
};

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

async function openPdfDocument(pdfBytes: Uint8Array) {
  const { loadingTask, pdf } = await openPdfJsDocument(pdfBytes);
  return { loadingTask, pdfDocument: pdf };
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

function normalizeHeadingKey(heading: string) {
  return heading
    .toLowerCase()
    .replace(/\d+/gu, " ")
    .replace(/[^\p{L}\s-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function estimatePdfPageBytes(
  totalPdfBytes: number,
  previewBytes: number[] | undefined,
  totalPages: number,
) {
  const averagePageBytes = Math.max(1, Math.round(totalPdfBytes / Math.max(totalPages, 1)));
  if (!previewBytes || previewBytes.length !== totalPages) {
    return {
      averagePageBytes,
      estimatedPageBytes: Array.from({ length: totalPages }, () => averagePageBytes),
    };
  }

  const sanitizedPreviewBytes = previewBytes.map((value) => Math.max(1, Math.round(value)));
  const totalPreviewBytes = sanitizedPreviewBytes.reduce((sum, value) => sum + value, 0);
  if (totalPreviewBytes <= 0) {
    return {
      averagePageBytes,
      estimatedPageBytes: Array.from({ length: totalPages }, () => averagePageBytes),
    };
  }

  const rawEstimates = sanitizedPreviewBytes.map(
    (value) => (value / totalPreviewBytes) * totalPdfBytes,
  );
  const estimatedPageBytes = rawEstimates.map((value) => Math.max(1, Math.floor(value)));
  let remainingBytes =
    totalPdfBytes - estimatedPageBytes.reduce((sum, value) => sum + value, 0);

  if (remainingBytes > 0) {
    const remainderOrder = rawEstimates
      .map((value, index) => ({
        index,
        remainder: value - Math.floor(value),
      }))
      .sort((left, right) => right.remainder - left.remainder);

    for (let cursor = 0; cursor < remainderOrder.length && remainingBytes > 0; cursor += 1) {
      estimatedPageBytes[remainderOrder[cursor].index] += 1;
      remainingBytes -= 1;
    }
  }

  return {
    averagePageBytes,
    estimatedPageBytes,
  };
}

export function summarizePageText(pageNumber: number, text: string): PdfTextPageSummary {
  const words = text.split(/\s+/u).filter(Boolean);
  const headingWords = words.slice(0, 12);
  const heading = headingWords.join(" ");
  const letters = heading.replace(/[^a-z]/giu, "");
  const uppercaseLetters = heading.replace(/[^A-Z]/gu, "");
  const uppercaseRatio =
    letters.length === 0 ? 0 : uppercaseLetters.length / Math.max(letters.length, 1);
  const keywordMatch = heading.match(
    /^(appendix|chapter|section|separator|divider|part)\b/iu,
  );
  const numberedDocumentMatch = heading.match(
    /^(invoice|statement)(?:\s+(?:number|no\.?|#)\s*[A-Z0-9-]+|\s+#?[0-9][A-Z0-9-]*)\b/iu,
  );

  return {
    pageNumber,
    heading,
    headingKey: normalizeHeadingKey(heading),
    wordCount: words.length,
    headingWordCount: headingWords.length,
    remainingWordCount: Math.max(words.length - headingWords.length, 0),
    uppercaseRatio,
    keyword: keywordMatch?.[1] ?? numberedDocumentMatch?.[1] ?? null,
  };
}

export function detectSeparatorCandidates(
  pageSummaries: PdfTextPageSummary[],
): PdfSeparatorCandidate[] {
  const repeatedHeadingThreshold = Math.max(2, Math.floor(pageSummaries.length * 0.18));
  const headingCounts = new Map<string, number>();

  for (const summary of pageSummaries) {
    if (!summary.headingKey) {
      continue;
    }

    headingCounts.set(summary.headingKey, (headingCounts.get(summary.headingKey) ?? 0) + 1);
  }

  return pageSummaries.flatMap((summary) => {
    if (summary.pageNumber <= 1 || !summary.heading) {
      return [];
    }

    const headingCount = summary.headingKey ? headingCounts.get(summary.headingKey) ?? 0 : 0;
    if (headingCount > repeatedHeadingThreshold) {
      return [];
    }

    const isIsolatedHeading =
      summary.headingWordCount >= 2 &&
      summary.headingWordCount <= 12 &&
      summary.uppercaseRatio >= 0.72 &&
      summary.remainingWordCount <= 12;
    const isKeywordBoundary = Boolean(summary.keyword);

    if (!isKeywordBoundary && !isIsolatedHeading) {
      return [];
    }

    return [
      {
        pageNumber: summary.pageNumber,
        heading: summary.heading || `Page ${summary.pageNumber}`,
        reason: isKeywordBoundary
          ? `Detected a boundary heading that starts with "${summary.keyword}".`
          : "Detected an isolated heading-style page opening.",
        wordCount: summary.wordCount,
      },
    ] satisfies PdfSeparatorCandidate[];
  });
}

async function getNormalizedPageText(pdfDocument: PdfDocumentProxy, pageNumber: number) {
  const page = await pdfDocument.getPage(pageNumber);

  try {
    const textContent = await page.getTextContent();
    return textContent.items
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
  } finally {
    page.cleanup();
  }
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function analyzePdfForSplit(
  pdfBytes: Uint8Array,
  options: PdfSplitAnalysisOptions = {},
): Promise<PdfSplitAnalysis> {
  const opened = await openPdfDocument(pdfBytes);
  const { loadingTask, pdfDocument } = opened;

  try {
    const totalPages = pdfDocument.numPages;
    const { averagePageBytes, estimatedPageBytes } = estimatePdfPageBytes(
      pdfBytes.byteLength,
      options.previewBytes,
      totalPages,
    );

    const outline = ((await pdfDocument.getOutline()) ?? []) as PdfOutlineItem[];
    const rawBookmarks = await flattenBookmarks(pdfDocument, outline);
    const bookmarkPageMap = new Map<number, PdfBookmarkBoundary>();
    for (const bookmark of rawBookmarks) {
      if (bookmark.pageNumber > 1 && !bookmarkPageMap.has(bookmark.pageNumber)) {
        bookmarkPageMap.set(bookmark.pageNumber, bookmark);
      }
    }

    const pageSummaries: PdfTextPageSummary[] = [];
    const batchSize = 8;

    for (let batchStart = 1; batchStart <= totalPages; batchStart += batchSize) {
      const batchEnd = Math.min(totalPages, batchStart + batchSize - 1);

      for (let pageNumber = batchStart; pageNumber <= batchEnd; pageNumber += 1) {
        const text = await getNormalizedPageText(pdfDocument, pageNumber);
        pageSummaries.push(summarizePageText(pageNumber, text));
      }

      options.onProgress?.({
        processedPages: batchEnd,
        totalPages,
      });

      if (batchEnd < totalPages) {
        await yieldToBrowser();
      }
    }

    return {
      bookmarks: Array.from(bookmarkPageMap.values()).sort(
        (left, right) => left.pageNumber - right.pageNumber,
      ),
      separatorCandidates: detectSeparatorCandidates(pageSummaries),
      estimatedPageBytes,
      averagePageBytes,
    };
  } finally {
    await destroyPdfJsDocument(loadingTask, pdfDocument);
  }
}
