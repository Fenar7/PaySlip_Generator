import type { Metadata } from "next";
import { PixelHub } from "@/features/pixel/components/pixel-hub";

export const metadata: Metadata = { title: "SW> Pixel | Slipwise One" };

export default function PixelPage() {
  return <PixelHub />;
}
