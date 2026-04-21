import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PdfFormFieldDraft } from "@/features/docs/pdf-studio/types";

export async function createPdfFormFields(
  pdfBytes: Uint8Array,
  drafts: PdfFormFieldDraft[],
) {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const warnings: string[] = [];

  drafts.forEach((draft, index) => {
    const page = doc.getPage(draft.pageIndex);
    const { width, height } = page.getSize();
    const fieldName = draft.name.trim() || `field-${index + 1}`;
    const x = draft.x * width;
    const y = height - draft.y * height - draft.height * height;
    const fieldWidth = draft.width * width;
    const fieldHeight = draft.height * height;

    page.drawText(draft.label, {
      x,
      y: y + fieldHeight + 6,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    if (draft.kind === "checkbox") {
      const field = form.createCheckBox(fieldName);
      field.addToPage(page, {
        x,
        y,
        width: fieldWidth,
        height: fieldHeight,
        borderWidth: 1,
        borderColor: rgb(0.25, 0.25, 0.25),
      });
      if (draft.required) {
        field.enableRequired();
      }
      return;
    }

    const field = form.createTextField(fieldName);
    if (draft.required) {
      field.enableRequired();
    }

    if (draft.defaultValue) {
      field.setText(draft.defaultValue);
    }

    if (draft.kind === "signature") {
      warnings.push(
        "Signature fields are created as interactive text placeholders so recipients can sign in their preferred PDF editor.",
      );
    }

    if (draft.kind === "date") {
      warnings.push(
        "Date fields are created as text fields so recipients can type the final date format they need.",
      );
    }

    field.addToPage(page, {
      x,
      y,
      width: fieldWidth,
      height: fieldHeight,
      textColor: rgb(0, 0, 0),
      borderWidth: 1,
      borderColor: rgb(0.25, 0.25, 0.25),
      backgroundColor: rgb(1, 1, 1),
      font,
    });
  });

  form.updateFieldAppearances(font);
  return {
    pdfBytes: await doc.save(),
    warnings,
  };
}
