import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { SlipwiseHome } from "@/components/marketing/slipwise-home";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Slipwise",
  description:
    "Slipwise is a modern SaaS product for generating vouchers, salary slips, and invoices with clean previews and export-ready output.",
};

export default function Home() {
  return <SlipwiseHome className={`${manrope.variable} ${sora.variable}`} />;
}
