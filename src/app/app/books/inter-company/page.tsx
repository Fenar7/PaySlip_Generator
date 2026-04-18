import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listInterCompanyTransfers } from "./actions";
import { InterCompanyTransferForm } from "./ict-form";

export const metadata: Metadata = { title: "Inter-Company Transfers | Books" };

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "danger"> = {
  DRAFT: "default",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  POSTED: "success",
  CANCELLED: "danger",
};

function formatAmount(amount: string | number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function InterCompanyTransfersPage() {
  const result = await listInterCompanyTransfers();
  const transfers = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inter-Company Transfers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Move funds between entities in your group. Transfers create balanced journal entries in
            both the source and destination organisations.
          </p>
        </div>
        <Link
          href="/app/intel/consolidation"
          className="inline-flex items-center h-8 rounded-lg px-3 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] transition-colors"
        >
          Consolidated View
        </Link>
      </div>

      <InterCompanyTransferForm />

      {transfers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            No inter-company transfers yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Recent Transfers</h2>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">From</th>
                  <th className="px-4 py-2 text-left font-medium">To</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(t.transferDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.sourceOrg.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.destinationOrg.name}</td>
                    <td className="px-4 py-3 text-slate-500">{t.description}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                      {formatAmount(t.amount.toNumber(), t.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[t.status] ?? "default"} className="text-xs">
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
