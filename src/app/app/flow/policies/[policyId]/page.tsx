import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Pencil } from "lucide-react";
import { ApprovalRuleEditor } from "@/components/flow/approval-rule-editor";
import { toggleApprovalPolicyStatus } from "@/app/app/flow/policies/actions";

export const metadata: Metadata = { title: "Policy Details — Flow" };

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { orgId } = await requireOrgContext();
  const { policyId } = await params;

  const [policy, rules] = await Promise.all([
    db.approvalPolicy.findFirst({ where: { id: policyId, orgId } }),
    db.approvalPolicyRule.findMany({
      where: { policyId },
      orderBy: { sequence: "asc" },
    }),
  ]);

  if (!policy) notFound();

  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/flow/policies"
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Policies
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{policy.name}</h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            {policy.module} · {policy.eventType}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
          policy.status === "ACTIVE"
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
            : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
        }`}>
          {policy.status}
        </span>
        <form action={async () => { "use server"; await toggleApprovalPolicyStatus(policyId); }}>
          <button
            type="submit"
            className="px-3 py-1 rounded-lg border text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {policy.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </form>
        <Link
          href={`/app/flow/policies/${policyId}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit Policy
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Module", value: policy.module },
          { label: "Event Type", value: policy.eventType },
          { label: "Step Mode", value: policy.stepMode },
          { label: "Escalate After", value: policy.escalateAfterMins ? `${policy.escalateAfterMins} min` : "—" },
        ].map((item) => (
          <div key={item.label} className="border rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm">
            <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-1">
              {item.label}
            </p>
            <p className="font-semibold text-sm">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="border rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm">
        <ApprovalRuleEditor policyId={policyId} rules={rules.map(r => ({
          ...r,
          minAmount: r.minAmount ? r.minAmount.toString() : null,
          maxAmount: r.maxAmount ? r.maxAmount.toString() : null,
        }))} />
      </div>
    </div>
  );
}
