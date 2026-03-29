import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { slipwiseBrand } from "@/components/foundation/slipwise-brand";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

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
      className={`${manrope.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
