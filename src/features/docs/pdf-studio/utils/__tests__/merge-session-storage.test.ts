import { describe, expect, it, beforeEach, afterAll } from "vitest";
import {
  loadMergeSession,
  saveMergeSession,
  clearMergeSession,
  buildMergeRestoreMessage,
} from "../merge-session-storage";

describe("merge-session-storage", () => {
  const store = new Map<string, string>();
  const original = globalThis.localStorage;

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "localStorage", {
      value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "localStorage", { value: original, writable: true });
  });

  it("returns null when no session", () => {
    expect(loadMergeSession("org-a")).toBeNull();
  });

  it("saves and loads pages and sources", () => {
    const pages = [
      { id: "p1", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d1", sourceLabel: "rpt", sourcePdfName: "rpt.pdf" },
      { id: "p2", pageIndex: 1, originalPageNumber: 2, rotation: 90, sourceDocumentId: "d1", sourceLabel: "rpt", sourcePdfName: "rpt.pdf" },
    ];
    saveMergeSession(pages, [{ id: "d1", name: "rpt.pdf", sourceLabel: "rpt", pageCount: 2 }], "final", "org-a");
    const loaded = loadMergeSession("org-a");
    expect(loaded!.filename).toBe("final");
    expect(loaded!.pages.length).toBe(2);
    expect(loaded!.pages[1].rotation).toBe(90);
  });

  it("defaults filename when empty", () => {
    saveMergeSession([{ id: "p", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d", sourceLabel: "f", sourcePdfName: "f.pdf" }], [], "  ", "org-a");
    expect(loadMergeSession("org-a")!.filename).toBe("merged-document");
  });

  it("clears session", () => {
    saveMergeSession([{ id: "p", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d", sourceLabel: "f", sourcePdfName: "f.pdf" }], [], "t", "org-a");
    clearMergeSession("org-a");
    expect(loadMergeSession("org-a")).toBeNull();
  });

  it("scopes by org", () => {
    const p = [{ id: "p", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d", sourceLabel: "f", sourcePdfName: "f.pdf" }];
    saveMergeSession(p, [], "a", "o1");
    saveMergeSession(p, [], "b", "o2");
    expect(loadMergeSession("o1")!.filename).toBe("a");
    expect(loadMergeSession("o2")!.filename).toBe("b");
  });

  it("handles corrupt data", () => {
    store.set("pdf-studio-merge-session-v1:org-a", "{bad");
    expect(loadMergeSession("org-a")).toBeNull();
  });

  it("stores no previewUrl", () => {
    saveMergeSession([{ id: "p", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d", sourceLabel: "f", sourcePdfName: "f.pdf" }], [], "t", "org-a");
    const raw = JSON.parse(store.get("pdf-studio-merge-session-v1:org-a")!);
    expect(raw.pages[0]).not.toHaveProperty("previewUrl");
  });

  it("handles 100 pages without errors", () => {
    const pages = Array.from({ length: 100 }, (_, i) => ({ id: "p" + i, pageIndex: i, originalPageNumber: i + 1, rotation: 0, sourceDocumentId: "d" + (i % 10), sourceLabel: "s" + (i % 10), sourcePdfName: "s" + (i % 10) + ".pdf" }));
    const sources = Array.from({ length: 10 }, (_, i) => ({ id: "d" + i, name: "s" + i + ".pdf", sourceLabel: "s" + i, pageCount: 10 }));
    expect(saveMergeSession(pages, sources, "big", "org-a")).toBe(true);
    expect(loadMergeSession("org-a")!.pages.length).toBe(100);
  });

  describe("buildMergeRestoreMessage", () => {
    it("empty for zero", () => expect(buildMergeRestoreMessage(0, 0)).toBe(""));
    it("plural pages and files", () => {
      const m = buildMergeRestoreMessage(5, 2);
      expect(m).toContain("5 pages");
      expect(m).toContain("2 files");
      expect(m).toContain("must be re-uploaded");
    });
    it("singular", () => {
      expect(buildMergeRestoreMessage(1, 1)).toContain("1 page");
    });
  });
});
