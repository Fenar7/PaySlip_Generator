import type { Metadata } from "next";
import { PixelHub } from "@/features/pixel/components/pixel-hub";

export const metadata: Metadata = { title: "SW Pixel | Slipwise" };

export default function PixelPage() {
  return <PixelHub />;
}
