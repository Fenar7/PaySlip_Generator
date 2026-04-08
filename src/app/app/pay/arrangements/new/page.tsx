import Link from "next/link";
import ArrangementForm from "../components/arrangement-form";

export const metadata = {
  title: "New Payment Arrangement | Slipwise",
};

export default function NewArrangementPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/app/pay/arrangements" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Arrangements
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">New Payment Arrangement</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up an installment payment plan for an outstanding invoice
          </p>
        </div>

        <ArrangementForm />
      </div>
    </div>
  );
}
