import { MarketingHeader } from "./marketing-header";
import Link from "next/link";

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-gray-500">
          © 2026 Slipwise One. A Zenxvio product.
        </p>
        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
