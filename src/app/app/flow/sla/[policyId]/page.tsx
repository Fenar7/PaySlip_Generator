import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, Pencil, Star } from "lucide-react";
import { setDefaultSlaPolicy, deleteSlaPolicy } from "@/app/app/flow/sla/actions";

export const metadata: Metadata = { title: "SLA Policy Details — Flow" };

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  NORMAL: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  HIGH: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  URGENT: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default async function SlaPolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { orgId } = await requireOrgContext();
  const { policyId } = await params;

  const policy = await db.ticketSlaPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) notFound();

  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/flow/sla"
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          SLA Policies
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Clock className="w-7 h-7 text-blue-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{policy.name}</h1>
            {policy.isDefault && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 uppercase tracking-wide">
                Default
              </span>
            )}
          </div>
          {policy.category && (
            <p className="text-[var(--muted-foreground)] text-sm">{policy.category}</p>
          )}
        </div>
        <Link
          href={`/app/flow/sla/${policyId}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </Link>
        {!policy.isDefault && (
          <form action={async () => { "use server"; await setDefaultSlaPolicy(policyId); }}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Star className="w-3 h-3" />
              Set as Default
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm">
          <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-1">
            First Response
          </p>
          <p className="font-bold text-2xl">{fmtMins(policy.firstResponseTargetMins)}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{policy.firstResponseTargetMins} minutes</p>
        </div>
        <div className="border rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm">
          <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-1">
            Resolution Target
          </p>
          <p className="font-bold text-2xl">{fmtMins(policy.resolutionTargetMins)}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{policy.resolutionTargetMins} minutes</p>
        </div>
        <div className="border rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm">
          <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-1">
            Schedule
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {policy.businessHoursOnly ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold">Business hours only</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold">Calendar days (24/7)</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm">
          <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-2">Priority Filter</p>
          {policy.priority ? (
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${PRIORITY_COLORS[policy.priority] ?? "bg-zinc-100 text-zinc-600"}`}>
              {policy.priority}
            </span>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Any priority</p>
          )}
        </div>
        <div className="border rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm">
          <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-2">Category Filter</p>
          {policy.category ? (
            <p className="text-sm font-medium">{policy.category}</p>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Any category</p>
          )}
        </div>
      </div>

      {!policy.isDefault && (
        <div className="border border-red-200 dark:border-red-900/30 rounded-xl p-4 bg-red-50 dark:bg-red-900/10">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Danger Zone</p>
          <form action={async () => { "use server"; await deleteSlaPolicy(policyId); }}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete SLA Policy
            </button>
          </form>
          <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1.5">
            This policy will be permanently deleted. Existing tickets using this policy are not affected.
          </p>
        </div>
      )}
    </div>
  );
}
