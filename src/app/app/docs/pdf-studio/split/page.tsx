import type { Metadata } from "next";
import { SplitWorkspace } from "@/features/docs/pdf-studio/components/split/split-workspace";

export const metadata: Metadata = {
  title: "Split PDF | PDF Studio",
};

export default function SplitPage() {
  return <SplitWorkspace />;
}
