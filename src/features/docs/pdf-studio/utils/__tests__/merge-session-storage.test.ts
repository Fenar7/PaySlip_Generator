import { describe, expect, it, beforeEach, afterAll, vi } from "vitest";
import {
  loadMergeSession,
  saveMergeSession,
  clearMergeSession,
  buildMergeRestoreMessage,
} from "../merge-session-storage";

describe("merge-session-storage", () => {
  const store = new Map<string, string>();
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    store.clear();
    // Mock localStorage
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
      },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "localStorage", { value: originalLocalStorage, writable: true });
  });

  it("returns null when no session is stored", () => {
    expect(loadMergeSession("org-a")).toBeNull();
  });

  it("saves and loads a merge session with pages and sources", () => {
    const pages = [
      { id: "p1", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "doc-1", sourceLabel: "report", sourcePdfName: "report.pdf", previewUrl: "data:image/png;base64,a" },
      { id: "p2", pageIndex: 1, originalPageNumber: 2, rotation: 90, sourceDocumentId: "doc-1", sourceLabel: "report", sourcePdfName: "report.pdf", previewUrl: "data:image/png;base64,b" },
    ];
    const sources = [{ id: "doc-1", name: "report.pdf", sourceLabel: "report", pageCount: 2 }];

    const saved = saveMergeSession(pages, sources, "final-merge", "org-a");
    expect(saved).toBe(true);

    const loaded = loadMergeSession("org-a");
    expect(loaded).not.toBeNull();
    expect(loaded!.filename).toBe("final-merge");
    expect(loaded!.pages.length).toBe(2);
    expect(loaded!.sources.length).toBe(1);
    expect(loaded!.pages[0].rotation).toBe(0);
    expect(loaded!.pages[1].rotation).toBe(90);
  });

  it("uses default filename when stored filename is empty", () => {
    const pages = [{ id: "p1", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d1", sourceLabel: "f", sourcePdfName: "f.pdf", previewUrl: "data:image/png;base64,a" }];
    const sources = [{ id: "d1", name: "f.pdf", sourceLabel: "f", pageCount: 1 }];

    saveMergeSession(pages, sources, "  ", "org-a");
    expect(loadMergeSession("org-a")!.filename).toBe("merged-document");
  });

  it("clears the session from storage", () => {
    const pages = [{ id: "p1", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d1", sourceLabel: "f", sourcePdfName: "f.pdf", previewUrl: "data:image/png;base64,a" }];
    saveMergeSession(pages, [], "test", "org-a");
    clearMergeSession("org-a");
    expect(loadMergeSession("org-a")).toBeNull();
  });

  it("scopes sessions by org id", () => {
    const pages = [{ id: "p1", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d1", sourceLabel: "f", sourcePdfName: "f.pdf", previewUrl: "data:image/png;base64,a" }];
    saveMergeSession(pages, [], "a", "org-1");
    saveMergeSession(pages, [], "b", "org-2");
    expect(loadMergeSession("org-1")!.filename).toBe("a");
    expect(loadMergeSession("org-2")!.filename).toBe("b");
  });

  it("handles corrupt session data gracefully", () => {
    store.set("pdf-studio-merge-session-v1:org-a", "{invalid-json");
    expect(loadMergeSession("org-a")).toBeNull();
  });

  describe("buildMergeRestoreMessage", () => {
    it("returns empty for zero pages", () => {
      expect(buildMergeRestoreMessage(0, 0)).toBe("");
    });

    it("builds a message for restored pages and sources", () => {
      const msg = buildMergeRestoreMessage(5, 2);
      expect(msg).toContain("5 pages");
      expect(msg).toContain("2 files");
      expect(msg).toContain("Source files must be re-uploaded");
    });

    it("uses singular for single page and file", () => {
      const msg = buildMergeRestoreMessage(1, 1);
      expect(msg).toContain("1 page");
      expect(msg).toContain("1 file");
    });
  });
});
