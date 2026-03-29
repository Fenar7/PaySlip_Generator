import type { Metadata } from "next";
import { slipwiseBrand } from "@/components/foundation/slipwise-brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: slipwiseBrand.name,
    template: `%s | ${slipwiseBrand.name}`,
  },
  description: slipwiseBrand.metadataDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
