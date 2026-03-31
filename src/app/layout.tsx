import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { slipwiseBrand } from "@/components/foundation/slipwise-brand";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: slipwiseBrand.name,
    template: `%s | ${slipwiseBrand.name}`,
  },
  description: slipwiseBrand.metadataDescription,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
      className={`${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
