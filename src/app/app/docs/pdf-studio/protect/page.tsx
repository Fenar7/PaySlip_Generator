import type { Metadata } from "next";
import { ProtectUnlockWorkspace } from "@/features/docs/pdf-studio/components/protect/protect-unlock-workspace";

export const metadata: Metadata = {
  title: "Protect & Unlock | PDF Studio",
};

export default function ProtectPage() {
  return <ProtectUnlockWorkspace />;
}
