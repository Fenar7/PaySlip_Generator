import type { Metadata } from "next";
import { SlipwiseHome } from "@/components/marketing/slipwise-home";

export const metadata: Metadata = {
  title: "Slipwise",
  description:
    "Slipwise is a modern SaaS product for generating vouchers, salary slips, and invoices with a premium homepage and clean exports.",
};

export default function Home() {
  return <SlipwiseHome />;
}
