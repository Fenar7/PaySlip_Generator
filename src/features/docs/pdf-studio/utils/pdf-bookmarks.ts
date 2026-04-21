import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { PdfBookmarkDraft } from "@/features/docs/pdf-studio/types";

type BookmarkNode = PdfBookmarkDraft & {
  children: BookmarkNode[];
};

function buildBookmarkTree(drafts: PdfBookmarkDraft[]) {
  const root: BookmarkNode = {
    id: "root",
    title: "root",
    pageNumber: 1,
    level: 0,
    children: [],
  };
  const stack: BookmarkNode[] = [root];

  drafts.forEach((draft) => {
    const node: BookmarkNode = { ...draft, children: [] };
    while (stack.length > draft.level + 1) {
      stack.pop();
    }
    stack[stack.length - 1]?.children.push(node);
    stack.push(node);
  });

  return root.children;
}

function countVisibleChildren(nodes: BookmarkNode[]): number {
  return nodes.reduce(
    (sum, node) => sum + 1 + countVisibleChildren(node.children),
    0,
  );
}

export async function applyPdfBookmarks(
  pdfBytes: Uint8Array,
  drafts: PdfBookmarkDraft[],
) {
  const doc = await PDFDocument.load(pdfBytes);
  const context = doc.context;
  const tree = buildBookmarkTree(drafts);
  const outlineRoot = context.obj({});
  const outlineRootRef = context.register(outlineRoot);

  const buildNodes = (
    nodes: BookmarkNode[],
    parentRef: typeof outlineRootRef,
  ) => {
    const refs = nodes.map(() => context.register(context.obj({})));

    nodes.forEach((node, index) => {
      const outlineRef = refs[index];
      const outline = context.lookup(outlineRef, PDFDict);
      const page = doc.getPage(Math.max(0, node.pageNumber - 1));
      const childRefs = buildNodes(node.children, outlineRef);

      outline.set(PDFName.of("Title"), PDFString.of(node.title));
      outline.set(PDFName.of("Parent"), parentRef);
      outline.set(
        PDFName.of("Dest"),
        context.obj([page.ref, PDFName.of("Fit")]),
      );

      if (index > 0) {
        outline.set(PDFName.of("Prev"), refs[index - 1]);
      }
      if (index < refs.length - 1) {
        outline.set(PDFName.of("Next"), refs[index + 1]);
      }

      if (childRefs.length > 0) {
        outline.set(PDFName.of("First"), childRefs[0]);
        outline.set(PDFName.of("Last"), childRefs[childRefs.length - 1]);
        outline.set(
          PDFName.of("Count"),
          context.obj(countVisibleChildren(node.children)),
        );
      }
    });

    return refs;
  };

  const topRefs = buildNodes(tree, outlineRootRef);
  if (topRefs.length > 0) {
    outlineRoot.set(PDFName.of("First"), topRefs[0]);
    outlineRoot.set(PDFName.of("Last"), topRefs[topRefs.length - 1]);
    outlineRoot.set(PDFName.of("Count"), context.obj(countVisibleChildren(tree)));
    doc.catalog.set(PDFName.of("Outlines"), outlineRootRef);
    doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  }

  return doc.save();
}
