import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createPdfFormFields } from "@/features/docs/pdf-studio/utils/pdf-form-writer";

describe("pdf form writer", () => {
  it("creates supported fields and warns when using placeholder date/signature fields", async () => {
    const document = await PDFDocument.create();
    document.addPage([400, 600]);
    const source = await document.save();

    const result = await createPdfFormFields(source, [
      {
        id: "field-1",
        name: "client_name",
        label: "Client name",
        kind: "text",
        pageIndex: 0,
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.06,
        required: true,
      },
      {
        id: "field-2",
        name: "signed_at",
        label: "Date",
        kind: "date",
        pageIndex: 0,
        x: 0.1,
        y: 0.35,
        width: 0.2,
        height: 0.06,
        required: false,
      },
      {
        id: "field-3",
        name: "signature",
        label: "Signature",
        kind: "signature",
        pageIndex: 0,
        x: 0.1,
        y: 0.5,
        width: 0.25,
        height: 0.06,
        required: false,
      },
    ]);

    const exported = await PDFDocument.load(result.pdfBytes);
    expect(exported.getForm().getFields().length).toBe(3);
    expect(result.warnings).toHaveLength(2);
  });
});
