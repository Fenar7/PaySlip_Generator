import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ShieldCheck, Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";

export const metadata: Metadata = { title: "Approval Policies — Flow" };

const MODULE_LABELS: Record<string, string> = {
  invoices: "Invoices",
  vouchers: "Vouchers",
  vendor_bills: "Vendor Bills",
  payment_runs: "Payment Runs",
  close: "Close Tasks",
};

export default async function PoliciesPage() {
  const { orgId } = await requireOrgContext();

  const policies = await db.approvalPolicy.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Policies</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Configure policy-driven approval routing for documents and financial actions.
          </p>
        </div>
        <Link
          href="/app/flow/policies/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Policy
        </Link>
      </div>

      {policies.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3 opacity-50" />
          <p className="font-medium text-lg">No approval policies configured</p>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Create a policy to start routing approvals automatically based on module, amount, and role.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Policy Name</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Module</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Event</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Mode</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Escalation</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium">{policy.name}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {MODULE_LABELS[policy.module] ?? policy.module}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs font-mono">
                    {policy.eventType}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {policy.stepMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">
                    {policy.escalateAfterMins ? `After ${policy.escalateAfterMins} min` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      policy.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                    }`}>
                      {policy.status === "ACTIVE"
                        ? <ToggleRight className="w-3 h-3" />
                        : <ToggleLeft className="w-3 h-3" />}
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/flow/policies/${policy.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
