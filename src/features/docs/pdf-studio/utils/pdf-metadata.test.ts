import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  diffPdfMetadata,
  readPdfMetadata,
  updatePdfMetadata,
} from "@/features/docs/pdf-studio/utils/pdf-metadata";

describe("pdf metadata helpers", () => {
  it("reads, diffs, and updates supported metadata fields", async () => {
    const document = await PDFDocument.create();
    document.addPage([400, 600]);
    const source = await document.save();

    const initial = await readPdfMetadata(source);
    const updatedBytes = await updatePdfMetadata(source, {
      ...initial.metadata,
      title: "Board Pack",
      author: "Slipwise",
      subject: "Quarterly review",
      keywords: "board, review, q2",
      creator: "PDF Studio",
      producer: "PDF Studio",
    });
    const updated = await readPdfMetadata(updatedBytes);

    expect(updated.metadata.title).toBe("Board Pack");
    expect(updated.metadata.author).toBe("Slipwise");
    expect(updated.metadata.keywords).toContain("board");
    expect(updated.metadata.keywords).toContain("review");
    expect(updated.metadata.keywords).toContain("q2");
    expect(
      diffPdfMetadata(initial.metadata, updated.metadata).filter(
        (entry) => entry.changed,
      ).length,
    ).toBeGreaterThan(0);
  });
});
