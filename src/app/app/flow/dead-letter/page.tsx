import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { resolveDeadLetterAction } from "./actions";
import { Skull, RotateCcw, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Dead-Letter Queue — Flow" };

export default async function DeadLetterPage() {
  const { orgId } = await requireOrgContext();

  const deadLetters = await db.deadLetterAction.findMany({
    where: { orgId },
    orderBy: { deadLetteredAt: "desc" },
    take: 100,
  });

  const unresolvedCount = deadLetters.filter((d) => !d.resolvedAt).length;

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dead-Letter Queue</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Background actions that exhausted all retries and require manual intervention.
          </p>
        </div>
        {unresolvedCount > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-600 dark:bg-red-900/30">
            {unresolvedCount} unresolved
          </span>
        )}
      </div>

      {deadLetters.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <p className="font-medium text-lg">Queue is clear</p>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            All background actions completed successfully. No failures requiring intervention.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Action</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Module</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Failure Reason</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Dead-lettered</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deadLetters.map((dl) => (
                <tr key={dl.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Skull className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="font-medium font-mono text-xs">{dl.actionType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">{dl.sourceModule}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                      {dl.failureReason}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {formatDistanceToNow(dl.deadLetteredAt, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {dl.resolvedAt ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                        Resolved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/30">
                        Unresolved
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!dl.resolvedAt && (
                      <form action={resolveDeadLetterAction.bind(null, dl.id)}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Mark Resolved
                        </button>
                      </form>
                    )}
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
