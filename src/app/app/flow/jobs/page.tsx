import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { replayAction, cancelAction } from "./actions";
import { ShieldAlert, RotateCcw, XCircle, Clock } from "lucide-react";

export default async function JobsConsolePage() {
  const { orgId } = await requireOrgContext();

  const actions = await db.scheduledAction.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flow Jobs Console</h1>
          <p className="text-[var(--muted-foreground)]">Manage scheduled background actions, monitor dead-letters, and replay failures.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Action</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Attempts</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Failure Reason</th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {actions.map((job) => (
              <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{job.actionType}</div>
                  <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(job.scheduledAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    job.status === 'DEAD_LETTERED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                    job.status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                    job.status === 'FAILED' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                    job.status === 'CANCELLED' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {job.attemptCount} / {job.maxAttempts}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] max-w-xs truncate" title={job.lastError || "None"}>
                  {job.lastError || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <form className="flex items-center justify-end gap-2">
                    <input type="hidden" name="id" value={job.id} />
                    {(job.status === 'DEAD_LETTERED' || job.status === 'FAILED') && (
                      <button formAction={async (fd) => {
                        "use server";
                        await replayAction(fd.get("id") as string);
                      }} className="p-1.5 text-[var(--muted-foreground)] hover:text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50" title="Replay Job">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {(job.status === 'PENDING' || job.status === 'FAILED' || job.status === 'DEAD_LETTERED') && (
                      <button formAction={async (fd) => {
                        "use server";
                        await cancelAction(fd.get("id") as string);
                      }} className="p-1.5 text-[var(--muted-foreground)] hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50" title="Cancel Job">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                </td>
              </tr>
            ))}

            {actions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  <ShieldAlert className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  No jobs found in the queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
