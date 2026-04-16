import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "SW Pixel — Free Photo Tools",
    template: "%s | SW Pixel",
  },
  description:
    "Free online photo tools: passport photos, ID photos, print sheets for UK, US, India, UAE, Schengen and more. No account required.",
  keywords: [
    "passport photo",
    "ID photo",
    "visa photo",
    "print sheet",
    "free photo tool",
  ],
  openGraph: {
    title: "SW Pixel — Free Photo Tools",
    description:
      "Create passport, visa, and ID photos instantly. Download or print.",
    type: "website",
  },
};

export default function PixelPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/pixel" className="text-sm font-semibold text-[#1a1a1a]">
            SW Pixel
          </Link>
          <nav className="flex items-center gap-4 text-sm text-[#666]">
            <Link href="/pixel/passport" className="hover:text-[#1a1a1a]">
              Passport Photos
            </Link>
            <Link
              href="/auth/login"
              className="rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#333]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mt-16 border-t border-[#e5e5e5] bg-white py-6 text-center text-xs text-[#999]">
        Powered by{" "}
        <Link href="/" className="hover:text-[#1a1a1a]">
          Slipwise One
        </Link>
      </footer>
    </div>
  );
}
