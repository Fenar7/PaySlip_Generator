import type { Metadata } from "next";
import { BookmarksWorkspace } from "@/features/docs/pdf-studio/components/bookmarks/bookmarks-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("bookmarks", "workspace");

export default function BookmarksPage() {
  return <BookmarksWorkspace />;
}
