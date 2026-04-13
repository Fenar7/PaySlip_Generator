import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

export const metadata: Metadata = { title: "Workflow Run History — Flow" };

const STEP_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
  RUNNING: "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
  SUCCEEDED: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
  FAILED: "bg-red-100 text-red-600 dark:bg-red-900/30",
  CANCELLED: "bg-orange-100 text-orange-500 dark:bg-orange-900/30",
};

const STEP_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  RUNNING: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  SUCCEEDED: <CheckCircle2 className="w-3.5 h-3.5" />,
  FAILED: <XCircle className="w-3.5 h-3.5" />,
  CANCELLED: <XCircle className="w-3.5 h-3.5" />,
};

type PageProps = {
  params: Promise<{ workflowId: string }>;
};

export default async function WorkflowRunsPage({ params }: PageProps) {
  const { workflowId } = await params;
  const { orgId } = await requireOrgContext();

  const workflow = await db.workflowDefinition.findUnique({
    where: { id: workflowId },
  });

  if (!workflow || workflow.orgId !== orgId) notFound();

  const runs = await db.workflowRun.findMany({
    where: { workflowId, orgId },
    include: { stepRuns: { orderBy: { startedAt: "asc" } } },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div>
        <Link
          href="/app/flow/workflows"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workflows
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Run History</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          <span className="font-medium text-foreground">{workflow.name}</span> · trigger:{" "}
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {workflow.triggerType}
          </code>
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-xl border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden"
          >
            {/* Run header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${STEP_STATUS_STYLES[run.status] ?? ""}`}
                >
                  {STEP_ICON[run.status]}
                  {run.status}
                </span>
                <span className="text-xs font-mono text-[var(--muted-foreground)]">{run.id}</span>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                {formatDistanceToNow(run.startedAt, { addSuffix: true })}
              </span>
            </div>

            {/* Step runs */}
            <div className="divide-y">
              {run.stepRuns.map((sr, i) => (
                <div key={sr.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-[var(--muted-foreground)] w-4 tabular-nums">{i + 1}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STEP_STATUS_STYLES[sr.status] ?? ""}`}
                  >
                    {STEP_ICON[sr.status]}
                    {sr.status}
                  </span>
                  {sr.failureReason && (
                    <span className="text-xs text-red-500 truncate">{sr.failureReason}</span>
                  )}
                </div>
              ))}

              {run.stepRuns.length === 0 && (
                <div className="px-4 py-3 text-xs text-[var(--muted-foreground)]">No step records.</div>
              )}
            </div>

            {run.failureReason && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/10 border-t text-xs text-red-600">
                {run.failureReason}
              </div>
            )}
          </div>
        ))}

        {runs.length === 0 && (
          <div className="rounded-xl border p-12 text-center text-[var(--muted-foreground)] bg-white dark:bg-zinc-950">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
            This workflow has not run yet.
          </div>
        )}
      </div>
    </div>
  );
}
