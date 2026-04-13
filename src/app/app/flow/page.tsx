import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { getFlowMetrics } from "@/lib/flow/metrics";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  AlertCircle,
  FileCheck2,
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  GitBranch,
  Shield,
} from "lucide-react";

export const metadata: Metadata = { title: "SW Flow Control Center" };

function ms(val: number | null): string {
  if (val === null) return "—";
  if (val < 60_000) return `${Math.round(val / 1000)}s`;
  if (val < 3_600_000) return `${Math.round(val / 60_000)}m`;
  return `${Math.round(val / 3_600_000)}h`;
}

export default async function FlowPage() {
  const { orgId } = await requireOrgContext();
  const m = await getFlowMetrics(orgId);

  const [recentRuns, workflows] = await Promise.all([
    db.workflowRun.findMany({
      where: { orgId },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { workflow: true },
    }),
    db.workflowDefinition.findMany({
      where: { orgId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="flex flex-col flex-1 p-6 gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flow Control Center</h1>
          <p className="text-[var(--muted-foreground)] mt-2">
            Manage approvals, SLAs, escalations, and automated workflows.
          </p>
        </div>
      </div>

      {/* Queue Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-medium">
            <FileCheck2 className="w-4 h-4" />
            <span>Pending Approvals</span>
          </div>
          <div className="text-3xl font-bold">{m.pendingApprovals}</div>
          {m.overdueApprovals > 0 && (
            <p className="text-xs text-red-500 font-medium">{m.overdueApprovals} overdue</p>
          )}
          <p className="text-xs text-[var(--muted-foreground)]">
            <Link href="/app/flow/approvals" className="hover:underline text-blue-600 dark:text-blue-400">
              View Queue →
            </Link>
          </p>
        </div>

        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Open Tickets</span>
          </div>
          <div className="text-3xl font-bold">{m.openTickets}</div>
          <p className="text-xs text-[var(--muted-foreground)]">
            <Link href="/app/flow/tickets" className="hover:underline text-blue-600 dark:text-blue-400">
              View Tickets →
            </Link>
          </p>
        </div>

        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm border-rose-100 dark:border-rose-900">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 font-medium">
            <Clock className="w-4 h-4" />
            <span>SLA Breaches</span>
          </div>
          <div className="text-3xl font-bold">{m.slaBreachCount}</div>
          <p className="text-xs text-[var(--muted-foreground)]">Requires intervention</p>
        </div>

        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm border-orange-100 dark:border-orange-900">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-medium">
            <ShieldAlert className="w-4 h-4" />
            <span>Dead-Lettered Actions</span>
          </div>
          <div className="text-3xl font-bold">{m.deadLetterCount}</div>
          <p className="text-xs text-[var(--muted-foreground)]">
            <Link href="/app/flow/jobs" className="hover:underline text-orange-600 dark:text-orange-500">
              View Jobs →
            </Link>
          </p>
        </div>
      </div>

      {/* Workflow Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Workflow Successes</span>
          </div>
          <div className="text-3xl font-bold">{m.workflowSuccessCount}</div>
        </div>

        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 font-medium">
            <XCircle className="w-4 h-4" />
            <span>Workflow Failures</span>
          </div>
          <div className="text-3xl font-bold">{m.workflowFailureCount}</div>
        </div>

        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Median Approval TAT</span>
          </div>
          <div className="text-3xl font-bold">{ms(m.medianApprovalTurnaroundMs)}</div>
          <p className="text-xs text-[var(--muted-foreground)]">Last 30 days</p>
        </div>

        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Median Ticket Resolution</span>
          </div>
          <div className="text-3xl font-bold">{ms(m.medianTicketResolutionMs)}</div>
          <p className="text-xs text-[var(--muted-foreground)]">Last 30 days</p>
        </div>
      </div>

      {/* Escalation Rules Quick Link */}
      <div className="border rounded-xl p-5 flex items-center justify-between bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Escalation Rules</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Configure automatic escalation for SLA breaches and approval timeouts.
            </p>
          </div>
        </div>
        <Link
          href="/app/flow/escalations"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
        >
          Manage Rules →
        </Link>
      </div>

      {/* Activity + Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <div className="border rounded-xl p-5 flex flex-col gap-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Workflow Activity
          </div>
          <div className="text-sm">
            {recentRuns.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/flow/workflows/${run.workflowId}/runs`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{run.workflow.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {run.triggerType.replace(/\./g, " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-0.5 text-xs">
                        <span className={`font-semibold ${
                          run.status === "SUCCEEDED" ? "text-emerald-600" :
                          run.status === "FAILED" ? "text-red-600" : "text-amber-600"
                        }`}>
                          {run.status}
                        </span>
                        <span className="text-[var(--muted-foreground)]">
                          {new Date(run.startedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center border-dashed border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 text-[var(--muted-foreground)]">
                No recent flow activity.
              </p>
            )}
          </div>
        </div>

        <div className="border rounded-xl p-5 flex flex-col gap-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <GitBranch className="w-5 h-5 text-purple-500" />
              Active Workflows
            </div>
            <Link href="/app/flow/workflows" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View All →
            </Link>
          </div>
          <div className="text-sm">
            {workflows.length > 0 ? (
              <div className="flex flex-col gap-3">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50/50 dark:bg-zinc-800/30"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{wf.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Trigger: {wf.triggerType}
                      </span>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                      Active
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center border-dashed border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 text-[var(--muted-foreground)]">
                No active workflows configured.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
