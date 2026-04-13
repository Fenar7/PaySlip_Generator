import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  PauseCircle,
  Pencil,
} from "lucide-react";
import { getWorkflowWithRuns } from "../actions";

export const metadata: Metadata = { title: "Workflow Details — Flow" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
  ACTIVE: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
  PAUSED: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30",
  ARCHIVED: "bg-red-100 text-red-500 dark:bg-red-900/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="w-3.5 h-3.5" />,
  ACTIVE: <CheckCircle2 className="w-3.5 h-3.5" />,
  PAUSED: <PauseCircle className="w-3.5 h-3.5" />,
  ARCHIVED: <XCircle className="w-3.5 h-3.5" />,
};

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  await requireOrgContext();
  const { workflowId } = await params;

  const workflow = await getWorkflowWithRuns(workflowId);

  if (!workflow) notFound();

  const canEdit = workflow.status === "DRAFT" || workflow.status === "PAUSED";
  const recentRuns = workflow.runs.slice(0, 10);

  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      {/* Back nav */}
      <div>
        <Link
          href="/app/flow/workflows"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Workflows
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <GitBranch className="w-7 h-7 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-[var(--muted-foreground)] text-sm mt-0.5">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              STATUS_STYLES[workflow.status] ?? ""
            }`}
          >
            {STATUS_ICON[workflow.status]}
            {workflow.status}
          </span>

          {canEdit && (
            <Link
              href={`/app/flow/workflows/${workflowId}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Trigger", value: workflow.triggerType },
          { label: "Status", value: workflow.status },
          { label: "Steps", value: String(workflow.steps.length) },
          { label: "Version", value: `v${workflow.version}` },
        ].map((item) => (
          <div
            key={item.label}
            className="border rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm"
          >
            <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mb-1">
              {item.label}
            </p>
            <p className="font-semibold text-sm truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="border rounded-xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-zinc-50 dark:bg-zinc-900/70">
          <p className="text-sm font-semibold">Workflow Steps</p>
        </div>
        {workflow.steps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8 border border-dashed rounded-lg m-4">
            No steps configured.{" "}
            {canEdit && (
              <Link
                href={`/app/flow/workflows/${workflowId}/edit`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add steps
              </Link>
            )}
          </p>
        ) : (
          <ol className="divide-y">
            {workflow.steps.map((step) => (
              <li key={step.id} className="flex items-start gap-3 px-5 py-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold shrink-0 mt-0.5">
                  {step.sequence}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
                      {step.actionType}
                    </code>
                  </p>
                  {step.config && Object.keys(step.config as object).length > 0 && (
                    <pre className="text-xs text-[var(--muted-foreground)] mt-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg px-3 py-2 overflow-x-auto">
                      {JSON.stringify(step.config, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Recent runs */}
      <div className="border rounded-xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-zinc-50 dark:bg-zinc-900/70 flex items-center justify-between">
          <p className="text-sm font-semibold">Recent Runs</p>
          <Link
            href={`/app/flow/workflows/${workflowId}/runs`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
            No runs yet.
          </p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 font-medium">Trigger</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentRuns.map((run) => (
                <tr key={run.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-2">
                    <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {run.triggerType}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-[var(--muted-foreground)] text-xs">
                    {run.sourceModule}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        run.status === "SUCCEEDED"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                          : run.status === "FAILED"
                          ? "bg-red-100 text-red-500 dark:bg-red-900/30"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--muted-foreground)] text-xs tabular-nums">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
