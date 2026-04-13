import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Policy Details — Flow" };

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { orgId } = await requireOrgContext();
  const { policyId } = await params;

  const policy = await db.approvalPolicy.findFirst({
    where: { id: policyId, orgId },
  });

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
        <p className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
          Policy Rules
        </p>
        <p className="text-sm text-[var(--muted-foreground)] text-center py-6 border border-dashed rounded-lg">
          Rule editing UI coming in a future release. Configure via API or data migration.
        </p>
      </div>
    </div>
  );
}
