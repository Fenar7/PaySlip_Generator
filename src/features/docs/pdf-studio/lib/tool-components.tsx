import type { ComponentType } from "react";
import { AlternateMixWorkspace } from "@/features/docs/pdf-studio/components/alternate-mix/alternate-mix-workspace";
import { BatesWorkspace } from "@/features/docs/pdf-studio/components/bates/bates-workspace";
import { BookmarksWorkspace } from "@/features/docs/pdf-studio/components/bookmarks/bookmarks-workspace";
import { CreateFormsWorkspace } from "@/features/docs/pdf-studio/components/create-forms/create-forms-workspace";
import { DeletePagesWorkspace } from "@/features/docs/pdf-studio/components/delete-pages/delete-pages-workspace";
import { EditorWorkspace } from "@/features/docs/pdf-studio/components/editor/editor-workspace";
import { ExtractPagesWorkspace } from "@/features/docs/pdf-studio/components/extract-pages/extract-pages-workspace";
import { ExtractImagesWorkspace } from "@/features/docs/pdf-studio/components/extract-images/extract-images-workspace";
import { FillSignWorkspace } from "@/features/docs/pdf-studio/components/fill-sign/fill-sign-workspace";
import { FlattenWorkspace } from "@/features/docs/pdf-studio/components/flatten/flatten-workspace";
import { GrayscaleWorkspace } from "@/features/docs/pdf-studio/components/grayscale/grayscale-workspace";
import { HeaderFooterWorkspace } from "@/features/docs/pdf-studio/components/header-footer/header-footer-workspace";
import { HtmlToPdfWorkspace } from "@/features/docs/pdf-studio/components/html-to-pdf/html-to-pdf-workspace";
import { JpgToPdfWorkspace } from "@/features/docs/pdf-studio/components/jpg-to-pdf/jpg-to-pdf-workspace";
import { MergeWorkspace } from "@/features/docs/pdf-studio/components/merge/merge-workspace";
import { MetadataWorkspace } from "@/features/docs/pdf-studio/components/metadata/metadata-workspace";
import { NUpWorkspace } from "@/features/docs/pdf-studio/components/n-up/n-up-workspace";
import { OrganizeWorkspace } from "@/features/docs/pdf-studio/components/organize/organize-workspace";
import { PageNumbersWorkspace } from "@/features/docs/pdf-studio/components/page-numbers/page-numbers-workspace";
import { PdfToExcelWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-excel/pdf-to-excel-workspace";
import { PdfStudioWorkspace } from "@/features/docs/pdf-studio/components/pdf-studio-workspace";
import { PdfToImageWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-image/pdf-to-image-workspace";
import { PdfToPptWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-ppt/pdf-to-ppt-workspace";
import { PdfToTextWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-text/pdf-to-text-workspace";
import { PdfToWordWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-word/pdf-to-word-workspace";
import { ProtectUnlockWorkspace } from "@/features/docs/pdf-studio/components/protect/protect-unlock-workspace";
import { RepairWorkspace } from "@/features/docs/pdf-studio/components/repair/repair-workspace";
import { RemoveAnnotationsWorkspace } from "@/features/docs/pdf-studio/components/remove-annotations/remove-annotations-workspace";
import { RenameWorkspace } from "@/features/docs/pdf-studio/components/rename/rename-workspace";
import { ResizePagesWorkspace } from "@/features/docs/pdf-studio/components/resize-pages/resize-pages-workspace";
import { RotatePagesWorkspace } from "@/features/docs/pdf-studio/components/rotate/rotate-pages-workspace";
import { SplitWorkspace } from "@/features/docs/pdf-studio/components/split/split-workspace";
import { UnlockWorkspace } from "@/features/docs/pdf-studio/components/unlock/unlock-workspace";
import { WatermarkWorkspace } from "@/features/docs/pdf-studio/components/watermark/watermark-workspace";
import { WordToPdfWorkspace } from "@/features/docs/pdf-studio/components/word-to-pdf/word-to-pdf-workspace";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

const TOOL_COMPONENTS: Record<PdfStudioToolId, ComponentType> = {
  create: PdfStudioWorkspace,
  "jpg-to-pdf": JpgToPdfWorkspace,
  merge: MergeWorkspace,
  "alternate-mix": AlternateMixWorkspace,
  split: SplitWorkspace,
  "extract-pages": ExtractPagesWorkspace,
  "delete-pages": DeletePagesWorkspace,
  organize: OrganizeWorkspace,
  rotate: RotatePagesWorkspace,
  "resize-pages": ResizePagesWorkspace,
  editor: EditorWorkspace,
  "fill-sign": FillSignWorkspace,
  "create-forms": CreateFormsWorkspace,
  "page-numbers": PageNumbersWorkspace,
  bates: BatesWorkspace,
  metadata: MetadataWorkspace,
  rename: RenameWorkspace,
  protect: ProtectUnlockWorkspace,
  unlock: UnlockWorkspace,
  watermark: WatermarkWorkspace,
  grayscale: GrayscaleWorkspace,
  "header-footer": HeaderFooterWorkspace,
  "remove-annotations": RemoveAnnotationsWorkspace,
  bookmarks: BookmarksWorkspace,
  flatten: FlattenWorkspace,
  repair: RepairWorkspace,
  "pdf-to-image": PdfToImageWorkspace,
  "extract-images": ExtractImagesWorkspace,
  "pdf-to-text": PdfToTextWorkspace,
  "pdf-to-word": PdfToWordWorkspace,
  "pdf-to-excel": PdfToExcelWorkspace,
  "pdf-to-ppt": PdfToPptWorkspace,
  "word-to-pdf": WordToPdfWorkspace,
  "html-to-pdf": HtmlToPdfWorkspace,
  "n-up": NUpWorkspace,
};

export function renderPdfStudioToolWorkspace(toolId: PdfStudioToolId) {
  const Component = TOOL_COMPONENTS[toolId];
  return <Component />;
}
