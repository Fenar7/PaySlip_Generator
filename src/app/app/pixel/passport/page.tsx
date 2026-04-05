import type { Metadata } from "next";
import { PassportWorkspace } from "@/features/pixel/components/passport/passport-workspace";

export const metadata: Metadata = { title: "Passport Photo | SW Pixel" };

export default function PassportPage() {
  return <PassportWorkspace />;
}
