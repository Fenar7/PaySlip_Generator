import type { Metadata } from "next";
import { FillSignWorkspace } from "@/features/docs/pdf-studio/components/fill-sign/fill-sign-workspace";

export const metadata: Metadata = {
  title: "Fill & Sign | PDF Studio",
};

export default function FillSignPage() {
  return <FillSignWorkspace />;
}
