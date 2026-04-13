import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  ShieldAlert,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toggleEscalationRule } from "./actions";

export const metadata: Metadata = { title: "Escalation Rules — Flow" };

const BREACH_TYPE_LABELS: Record<string, string> = {
  approval_breach: "Approval Breach",
  first_response_breach: "First Response Breach",
  resolution_breach: "Resolution Breach",
  delivery_failure: "Delivery Failure",
  dead_letter_summary: "Dead Letter Summary",
};

function ToggleButton({ ruleId, enabled }: { ruleId: string; enabled: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await toggleEscalationRule(ruleId);
      }}
    >
      <button
        type="submit"
        title={enabled ? "Disable rule" : "Enable rule"}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          enabled
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {enabled ? (
          <>
            <ToggleRight className="w-3 h-3" />
            Enabled
          </>
        ) : (
          <>
            <ToggleLeft className="w-3 h-3" />
            Disabled
          </>
        )}
      </button>
    </form>
  );
}

export default async function EscalationsPage() {
  const { orgId } = await requireOrgContext();

  const rules = await db.ticketEscalationRule.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escalation Rules</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Automatically escalate breached SLA events to the right people.
          </p>
        </div>
        <Link
          href="/app/flow/escalations/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Escalation Rule
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3 opacity-50" />
          <p className="font-medium text-lg">No escalation rules configured</p>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Create a rule to automatically escalate SLA breaches to the right team member or role.
          </p>
          <Link
            href="/app/flow/escalations/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create first rule
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Name</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Breach Type</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">After (mins)</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Target</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Notify Admins</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {BREACH_TYPE_LABELS[rule.breachType] ?? rule.breachType}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{rule.afterMins}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">
                    {rule.targetRole && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-mono mr-1">
                        role: {rule.targetRole}
                      </span>
                    )}
                    {rule.targetUserId && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-mono">
                        user: {rule.targetUserId.slice(0, 8)}…
                      </span>
                    )}
                    {!rule.targetRole && !rule.targetUserId && "—"}
                  </td>
                  <td className="px-4 py-3">
                    {rule.notifyOrgAdmins ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleButton ruleId={rule.id} enabled={rule.enabled} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/flow/escalations/${rule.id}/edit`}
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
