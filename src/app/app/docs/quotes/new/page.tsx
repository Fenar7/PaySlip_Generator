import type { Metadata } from "next";
import { QuoteForm } from "../components/quote-form";
import { listCustomers } from "@/app/app/data/actions";

export const metadata: Metadata = {
  title: "New Quote | Slipwise",
  description: "Create a new quote for your customer.",
};

export default async function NewQuotePage() {
  const customersResult = await listCustomers({ limit: 200 }).catch(() => ({ customers: [] }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <QuoteForm customers={customersResult.customers} />
      </div>
    </div>
  );
}
