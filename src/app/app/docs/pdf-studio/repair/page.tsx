import type { Metadata } from "next";
import { RepairWorkspace } from "@/features/docs/pdf-studio/components/repair/repair-workspace";

export const metadata: Metadata = {
  title: "Repair PDF | PDF Studio",
};

export default function RepairPage() {
  return <RepairWorkspace />;
}
