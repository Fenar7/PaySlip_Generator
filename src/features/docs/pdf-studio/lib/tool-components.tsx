import type { ComponentType } from "react";
import { AlternateMixWorkspace } from "@/features/docs/pdf-studio/components/alternate-mix/alternate-mix-workspace";
import { DeletePagesWorkspace } from "@/features/docs/pdf-studio/components/delete-pages/delete-pages-workspace";
import { ExtractPagesWorkspace } from "@/features/docs/pdf-studio/components/extract-pages/extract-pages-workspace";
import { ExtractImagesWorkspace } from "@/features/docs/pdf-studio/components/extract-images/extract-images-workspace";
import { FillSignWorkspace } from "@/features/docs/pdf-studio/components/fill-sign/fill-sign-workspace";
import { HeaderFooterWorkspace } from "@/features/docs/pdf-studio/components/header-footer/header-footer-workspace";
import { MergeWorkspace } from "@/features/docs/pdf-studio/components/merge/merge-workspace";
import { OrganizeWorkspace } from "@/features/docs/pdf-studio/components/organize/organize-workspace";
import { PdfStudioWorkspace } from "@/features/docs/pdf-studio/components/pdf-studio-workspace";
import { PdfToImageWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-image/pdf-to-image-workspace";
import { ProtectUnlockWorkspace } from "@/features/docs/pdf-studio/components/protect/protect-unlock-workspace";
import { RepairWorkspace } from "@/features/docs/pdf-studio/components/repair/repair-workspace";
import { ResizePagesWorkspace } from "@/features/docs/pdf-studio/components/resize-pages/resize-pages-workspace";
import { RotatePagesWorkspace } from "@/features/docs/pdf-studio/components/rotate/rotate-pages-workspace";
import { SplitWorkspace } from "@/features/docs/pdf-studio/components/split/split-workspace";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

const TOOL_COMPONENTS: Record<PdfStudioToolId, ComponentType> = {
  create: PdfStudioWorkspace,
  merge: MergeWorkspace,
  "alternate-mix": AlternateMixWorkspace,
  split: SplitWorkspace,
  "extract-pages": ExtractPagesWorkspace,
  "delete-pages": DeletePagesWorkspace,
  organize: OrganizeWorkspace,
  rotate: RotatePagesWorkspace,
  "resize-pages": ResizePagesWorkspace,
  "fill-sign": FillSignWorkspace,
  protect: ProtectUnlockWorkspace,
  "header-footer": HeaderFooterWorkspace,
  repair: RepairWorkspace,
  "pdf-to-image": PdfToImageWorkspace,
  "extract-images": ExtractImagesWorkspace,
};

export function renderPdfStudioToolWorkspace(toolId: PdfStudioToolId) {
  const Component = TOOL_COMPONENTS[toolId];
  return <Component />;
}
