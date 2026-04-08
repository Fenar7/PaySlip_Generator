import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { CreateSequenceForm } from "./create-sequence-form";

export const metadata = {
  title: "New Dunning Sequence | Slipwise",
};

export default function NewSequencePage() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/app/pay/dunning"
          className="hover:text-slate-700 transition-colors"
        >
          Dunning
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-900 font-medium">New Sequence</span>
      </nav>

      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">
            Create Dunning Sequence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Define a new multi-step reminder sequence for overdue invoices.
          </p>
        </CardHeader>
        <CardContent>
          <CreateSequenceForm />
        </CardContent>
      </Card>
    </div>
  );
}
