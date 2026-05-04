/**
 * Merge workspace session persistence.
 *
 * Invariant: source PDF bytes are too large for localStorage (5-10MB limit).
 * Only metadata (filenames, page order, rotations, source labels) is persisted.
 * On restore, the user sees what was recovered and what must be re-uploaded.
 */
"use client";

export type MergeSessionPage = {
  id: string;
  pageIndex: number;
  originalPageNumber: number;
  rotation: number;
  sourceDocumentId: string;
  sourceLabel: string;
  sourcePdfName: string;
};

export type MergeSessionSource = {
  id: string;
  name: string;
  sourceLabel: string;
  pageCount: number;
};

export type MergeSession = {
  filename: string;
  pages: MergeSessionPage[];
  sources: MergeSessionSource[];
  savedAt: string;
};

const MERGE_SESSION_KEY = "pdf-studio-merge-session-v1";

export function loadMergeSession(scope = "anonymous"): MergeSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${MERGE_SESSION_KEY}:${scope}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pages) || !Array.isArray(parsed.sources)) {
      return null;
    }

    return {
      filename: typeof parsed.filename === "string" && parsed.filename.trim()
        ? parsed.filename
        : "merged-document",
      pages: parsed.pages.filter(
        (p: Record<string, unknown>) =>
          typeof p.id === "string" &&
          typeof p.sourceDocumentId === "string",
      ),
      sources: parsed.sources.filter(
        (s: Record<string, unknown>) =>
          typeof s.id === "string" &&
          typeof s.name === "string" &&
          typeof s.sourceLabel === "string" &&
          typeof s.pageCount === "number",
      ),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveMergeSession(
  pages: MergeSessionPage[],
  sources: MergeSessionSource[],
  filename: string,
  scope = "anonymous",
): boolean {
  if (typeof window === "undefined") return false;

  const payload: MergeSession = {
    filename: filename.trim() || "merged-document",
    pages,
    sources,
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      `${MERGE_SESSION_KEY}:${scope}`,
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearMergeSession(scope = "anonymous"): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${MERGE_SESSION_KEY}:${scope}`);
}

export function buildMergeRestoreMessage(
  restoredPageCount: number,
  restoredSourceCount: number,
): string {
  if (restoredPageCount === 0) return "";

  const pageLabel = `${restoredPageCount} page${restoredPageCount !== 1 ? "s" : ""}`;
  const sourceLabel = `${restoredSourceCount} file${restoredSourceCount !== 1 ? "s" : ""}`;

  return `Previous session restored: ${pageLabel} from ${sourceLabel} — page order and rotations were recovered. Source files must be re-uploaded to export.`;
}
