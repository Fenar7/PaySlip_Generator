import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Document Generator",
  description:
    "A premium document generator for vouchers, salary slips, and invoices.",
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
