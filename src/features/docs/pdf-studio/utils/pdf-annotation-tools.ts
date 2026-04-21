import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  type PDFRef,
} from "pdf-lib";

export type PdfAnnotationGroup =
  | "comments"
  | "markup"
  | "drawings"
  | "links"
  | "widgets"
  | "stamps"
  | "all";

const GROUP_SUBTYPES: Record<Exclude<PdfAnnotationGroup, "all">, string[]> = {
  comments: ["Text", "Popup", "FreeText", "Caret"],
  markup: ["Highlight", "Underline", "Squiggly", "StrikeOut"],
  drawings: ["Ink", "Square", "Circle", "Line", "Polygon", "PolyLine"],
  links: ["Link"],
  widgets: ["Widget"],
  stamps: ["Stamp"],
};

function getSubtypeName(annots: PDFArray, index: number) {
  const annotation = annots.lookup(index, PDFDict);
  if (!annotation) {
    return null;
  }

  const subtype = annotation.lookup(PDFName.of("Subtype"), PDFName);
  if (!subtype) {
    return null;
  }

  return subtype.decodeText();
}

function shouldRemoveSubtype(subtype: string | null, groups: PdfAnnotationGroup[]) {
  if (!subtype) {
    return false;
  }

  if (groups.includes("all")) {
    return true;
  }

  return groups.some((group) =>
    group !== "all" ? GROUP_SUBTYPES[group].includes(subtype) : false,
  );
}

export async function inspectPdfAnnotations(pdfBytes: Uint8Array) {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  const counts = new Map<string, number>();

  pages.forEach((page) => {
    const annots = page.node.Annots();
    if (!(annots instanceof PDFArray)) {
      return;
    }

    for (let index = 0; index < annots.size(); index += 1) {
      const subtype = getSubtypeName(annots, index) ?? "Unknown";
      counts.set(subtype, (counts.get(subtype) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .map(([subtype, count]) => ({ subtype, count }))
    .sort((left, right) => right.count - left.count);
}

export async function removePdfAnnotations(
  pdfBytes: Uint8Array,
  groups: PdfAnnotationGroup[],
) {
  const doc = await PDFDocument.load(pdfBytes);
  let removedCount = 0;

  doc.getPages().forEach((page) => {
    const annots = page.node.Annots();
    if (!(annots instanceof PDFArray)) {
      return;
    }

    const refsToRemove: PDFRef[] = [];
    for (let index = 0; index < annots.size(); index += 1) {
      const subtype = getSubtypeName(annots, index);
      const annotationRef = annots.get(index);
      if (shouldRemoveSubtype(subtype, groups) && annotationRef instanceof Object) {
        refsToRemove.push(annotationRef as PDFRef);
      }
    }

    refsToRemove.forEach((annotationRef) => {
      page.node.removeAnnot(annotationRef);
      removedCount += 1;
    });
  });

  return {
    pdfBytes: await doc.save(),
    removedCount,
  };
}

export async function flattenPdfFormFields(pdfBytes: Uint8Array) {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const fieldCount = form.getFields().length;
  form.flatten();
  return {
    pdfBytes: await doc.save(),
    flattenedFieldCount: fieldCount,
  };
}
