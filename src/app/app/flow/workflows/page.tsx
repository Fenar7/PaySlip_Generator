import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  PauseCircle,
} from "lucide-react";

export const metadata: Metadata = { title: "Workflow Definitions — Flow" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
  ACTIVE: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
  INACTIVE: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30",
  ARCHIVED: "bg-red-100 text-red-500 dark:bg-red-900/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="w-3.5 h-3.5" />,
  ACTIVE: <CheckCircle2 className="w-3.5 h-3.5" />,
  INACTIVE: <PauseCircle className="w-3.5 h-3.5" />,
  ARCHIVED: <XCircle className="w-3.5 h-3.5" />,
};

export default async function WorkflowsPage() {
  const { orgId } = await requireOrgContext();

  const workflows = await db.workflowDefinition.findMany({
    where: { orgId },
    include: {
      _count: { select: { runs: true, steps: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow Definitions</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Configure bounded trigger/action automations for your organisation.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] border rounded-lg px-3 py-1.5">
          <Zap className="w-3.5 h-3.5" />
          Bounded — approved trigger &amp; action families only
        </span>
      </div>

      <div className="rounded-xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Name</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Trigger</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Steps</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Runs</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Version</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workflows.map((wf) => (
              <tr key={wf.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-3">
                  <Link href={`/app/flow/workflows/${wf.id}`} className="font-medium hover:underline flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[var(--muted-foreground)]" />
                    {wf.name}
                  </Link>
                  {wf.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-xs">{wf.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    {wf.triggerType}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[wf.status] ?? ""}`}>
                    {STATUS_ICON[wf.status]}
                    {wf.status}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{wf._count.steps}</td>
                <td className="px-4 py-3 tabular-nums">
                  <Link href={`/app/flow/workflows/${wf.id}/runs`} className="hover:underline text-blue-600 dark:text-blue-400">
                    {wf._count.runs}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">v{wf.version}</td>
              </tr>
            ))}

            {workflows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                  <GitBranch className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No workflow definitions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
