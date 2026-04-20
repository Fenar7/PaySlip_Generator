export type PdfSplitSegmentReason =
  | "range"
  | "every-n"
  | "half"
  | "selected-start"
  | "bookmark"
  | "size-target"
  | "text-separator";

export type PdfSplitSegment = {
  id: string;
  label: string;
  startPage: number;
  endPage: number;
  pageIndices: number[];
  reason: PdfSplitSegmentReason;
  detail?: string;
  estimatedSizeBytes?: number;
  heuristic?: boolean;
};

export type PdfSplitPlan = {
  segments: PdfSplitSegment[];
  warning?: string;
  heuristic?: boolean;
};

export type PdfBookmarkBoundary = {
  title: string;
  pageNumber: number;
  level: number;
};

export type PdfSeparatorCandidate = {
  pageNumber: number;
  heading: string;
  reason: string;
};

function buildPageIndices(startPage: number, endPage: number) {
  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index - 1);
}

function buildSegment(options: {
  startPage: number;
  endPage: number;
  reason: PdfSplitSegmentReason;
  label?: string;
  detail?: string;
  heuristic?: boolean;
  estimatedSizeBytes?: number;
}) {
  return {
    id: `${options.reason}-${options.startPage}-${options.endPage}`,
    label:
      options.label ??
      (options.startPage === options.endPage
        ? `Page ${options.startPage}`
        : `Pages ${options.startPage}-${options.endPage}`),
    startPage: options.startPage,
    endPage: options.endPage,
    pageIndices: buildPageIndices(options.startPage, options.endPage),
    reason: options.reason,
    detail: options.detail,
    heuristic: options.heuristic,
    estimatedSizeBytes: options.estimatedSizeBytes,
  } satisfies PdfSplitSegment;
}

function uniqueSortedPageNumbers(pageNumbers: number[], totalPages: number) {
  return Array.from(
    new Set(pageNumbers.filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)),
  ).sort((left, right) => left - right);
}

function buildSegmentsFromStartPages(options: {
  startPages: number[];
  totalPages: number;
  reason: PdfSplitSegmentReason;
  labelForStartPage?: (startPage: number) => string | undefined;
  detailForStartPage?: (startPage: number) => string | undefined;
  heuristic?: boolean;
  estimatedPageBytes?: number[];
}) {
  const startPages = uniqueSortedPageNumbers(
    options.startPages[0] === 1 ? options.startPages : [1, ...options.startPages],
    options.totalPages,
  );

  return startPages.map((startPage, index) => {
    const endPage = (startPages[index + 1] ?? options.totalPages + 1) - 1;
    const estimatedSizeBytes = options.estimatedPageBytes
      ? options.estimatedPageBytes
          .slice(startPage - 1, endPage)
          .reduce((sum, bytes) => sum + bytes, 0)
      : undefined;

    return buildSegment({
      startPage,
      endPage,
      reason: options.reason,
      label: options.labelForStartPage?.(startPage),
      detail: options.detailForStartPage?.(startPage),
      heuristic: options.heuristic,
      estimatedSizeBytes,
    });
  });
}

export function planSplitByRanges(
  ranges: Array<{ start: number; end: number }>,
  totalPages: number,
): PdfSplitPlan {
  const segments = ranges.map((range) =>
    buildSegment({
      startPage: range.start + 1,
      endPage: range.end + 1,
      reason: "range",
    }),
  );

  return {
    segments,
    warning:
      segments.length === 0 ? "Enter at least one page range to preview the split." : undefined,
  };
}

export function planSplitEveryN(totalPages: number, everyN: number): PdfSplitPlan {
  if (everyN < 1) {
    return {
      segments: [],
      warning: "Enter at least one page per file to preview the split.",
    };
  }

  const segments: PdfSplitSegment[] = [];
  for (let startPage = 1; startPage <= totalPages; startPage += everyN) {
    const endPage = Math.min(totalPages, startPage + everyN - 1);
    segments.push(
      buildSegment({
        startPage,
        endPage,
        reason: "every-n",
      }),
    );
  }

  return { segments };
}

export function planSplitInHalf(totalPages: number): PdfSplitPlan {
  if (totalPages < 2) {
    return {
      segments: [],
      warning: "Split in half needs at least two pages.",
    };
  }

  const midpoint = Math.ceil(totalPages / 2);
  return {
    segments: [
      buildSegment({
        startPage: 1,
        endPage: midpoint,
        reason: "half",
        label: "First half",
      }),
      buildSegment({
        startPage: midpoint + 1,
        endPage: totalPages,
        reason: "half",
        label: "Second half",
      }),
    ],
  };
}

export function planSplitBySelectedStarts(
  totalPages: number,
  selectedStartPages: number[],
): PdfSplitPlan {
  const normalizedStarts = uniqueSortedPageNumbers(selectedStartPages, totalPages).filter(
    (pageNumber) => pageNumber > 1,
  );

  if (normalizedStarts.length === 0) {
    return {
      segments: [],
      warning: "Select one or more pages that should start a new file.",
    };
  }

  return {
    segments: buildSegmentsFromStartPages({
      startPages: normalizedStarts,
      totalPages,
      reason: "selected-start",
    }),
  };
}

export function planSplitByBookmarks(
  totalPages: number,
  bookmarks: PdfBookmarkBoundary[],
): PdfSplitPlan {
  const startPages = uniqueSortedPageNumbers(
    bookmarks.map((bookmark) => bookmark.pageNumber).filter((pageNumber) => pageNumber > 1),
    totalPages,
  );

  if (startPages.length === 0) {
    return {
      segments: [],
      warning: "No bookmark boundaries were found in this PDF.",
    };
  }

  const titleByPage = new Map(
    bookmarks.map((bookmark) => [bookmark.pageNumber, bookmark.title] as const),
  );

  return {
    segments: buildSegmentsFromStartPages({
      startPages,
      totalPages,
      reason: "bookmark",
      labelForStartPage: (startPage) => titleByPage.get(startPage),
      detailForStartPage: (startPage) => titleByPage.get(startPage),
    }),
  };
}

export function planSplitByTargetSize(options: {
  totalPages: number;
  targetBytes: number;
  estimatedPageBytes: number[];
}) {
  if (options.targetBytes <= 0) {
    return {
      segments: [],
      warning: "Enter a positive size target to preview estimated split files.",
    };
  }

  const segments: PdfSplitSegment[] = [];
  let startPage = 1;
  let currentSize = 0;

  for (let pageIndex = 0; pageIndex < options.totalPages; pageIndex += 1) {
    const nextPageNumber = pageIndex + 1;
    const estimatedPageSize = options.estimatedPageBytes[pageIndex] ?? 0;
    const wouldExceedTarget =
      currentSize > 0 && currentSize + estimatedPageSize > options.targetBytes;

    if (wouldExceedTarget) {
      segments.push(
        buildSegment({
          startPage,
          endPage: nextPageNumber - 1,
          reason: "size-target",
          label: `Estimated part ${segments.length + 1}`,
          heuristic: true,
          estimatedSizeBytes: currentSize,
        }),
      );
      startPage = nextPageNumber;
      currentSize = 0;
    }

    currentSize += estimatedPageSize;
  }

  if (startPage <= options.totalPages) {
    segments.push(
      buildSegment({
        startPage,
        endPage: options.totalPages,
        reason: "size-target",
        label: `Estimated part ${segments.length + 1}`,
        heuristic: true,
        estimatedSizeBytes: currentSize,
      }),
    );
  }

  return {
    segments,
    heuristic: true,
  } satisfies PdfSplitPlan;
}

export function planSplitByDetectedSeparators(
  totalPages: number,
  candidates: PdfSeparatorCandidate[],
): PdfSplitPlan {
  const startPages = uniqueSortedPageNumbers(
    candidates.map((candidate) => candidate.pageNumber).filter((pageNumber) => pageNumber > 1),
    totalPages,
  );

  if (startPages.length === 0) {
    return {
      segments: [],
      warning: "No strong text separators were detected in this PDF.",
      heuristic: true,
    };
  }

  const candidateByPage = new Map(
    candidates.map((candidate) => [candidate.pageNumber, candidate] as const),
  );

  return {
    segments: buildSegmentsFromStartPages({
      startPages,
      totalPages,
      reason: "text-separator",
      labelForStartPage: (startPage) => candidateByPage.get(startPage)?.heading,
      detailForStartPage: (startPage) => candidateByPage.get(startPage)?.reason,
      heuristic: true,
    }),
    heuristic: true,
  };
}
