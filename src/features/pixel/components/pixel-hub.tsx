"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";

const TOOLS = [
  {
    icon: "🪪",
    title: "Passport Photo",
    description: "Make passport, visa & ID photos in seconds",
    href: "/app/pixel/passport",
  },
  {
    icon: "📐",
    title: "Resize & Compress",
    description: "Resize to exact dimensions or target file size",
    href: "/app/pixel/resize",
  },
  {
    icon: "🎨",
    title: "Basic Adjustments",
    description: "Brightness, contrast, B&W and more",
    href: "/app/pixel/adjust",
  },
  {
    icon: "🖨",
    title: "Print Layout",
    description: "Arrange photos for printing on A4 or Letter",
    href: "/app/pixel/print-layout",
  },
  {
    icon: "🏷",
    title: "Name & Date Labels",
    description: "Add text labels to any photo",
    href: "/app/pixel/label",
  },
] as const;

export function PixelHub() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="text-center mb-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#666] mb-2">
          Image Tools
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">
          SW&gt; Pixel
        </h1>
        <p className="mt-2 text-sm text-[#666] max-w-md mx-auto">
          Photo &amp; image tools for every need
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-2 py-6">
                <span className="text-3xl">{tool.icon}</span>
                <h2 className="text-base font-semibold text-[#1a1a1a] group-hover:text-[var(--accent)] transition-colors">
                  {tool.title}
                </h2>
                <p className="text-sm text-[#666] leading-relaxed">
                  {tool.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
