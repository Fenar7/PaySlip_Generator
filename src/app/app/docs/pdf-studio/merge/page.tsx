import type { Metadata } from "next";
import { MergeWorkspace } from "@/features/docs/pdf-studio/components/merge/merge-workspace";

export const metadata: Metadata = {
  title: "Merge PDFs | PDF Studio",
};

export default function MergePage() {
  return <MergeWorkspace />;
}
