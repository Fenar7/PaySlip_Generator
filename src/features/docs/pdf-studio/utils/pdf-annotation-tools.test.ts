import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  flattenPdfFormFields,
  inspectPdfAnnotations,
  removePdfAnnotations,
} from "@/features/docs/pdf-studio/utils/pdf-annotation-tools";

async function createPdfWithCheckbox() {
  const document = await PDFDocument.create();
  const page = document.addPage([400, 600]);
  const form = document.getForm();
  const checkBox = form.createCheckBox("approved");
  checkBox.addToPage(page, { x: 40, y: 520, width: 20, height: 20 });
  return document.save();
}

describe("pdf annotation tools", () => {
  it("inspects and removes widget annotations selectively", async () => {
    const source = await createPdfWithCheckbox();

    const before = await inspectPdfAnnotations(source);
    expect(before.some((entry) => entry.subtype === "Widget")).toBe(true);

    const result = await removePdfAnnotations(source, ["widgets"]);
    const after = await inspectPdfAnnotations(result.pdfBytes);
    expect(after.some((entry) => entry.subtype === "Widget")).toBe(false);
    expect(result.removedCount).toBeGreaterThan(0);
  });

  it("flattens form fields into non-interactive output", async () => {
    const source = await createPdfWithCheckbox();
    const result = await flattenPdfFormFields(source);
    const exported = await PDFDocument.load(result.pdfBytes);

    expect(result.flattenedFieldCount).toBe(1);
    expect(exported.getForm().getFields()).toHaveLength(0);
  });
});
