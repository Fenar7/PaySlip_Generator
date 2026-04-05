import type { Metadata } from "next";
import Link from "next/link";
import {
  listRecurringRules,
  pauseRecurringRule,
  resumeRecurringRule,
  deleteRecurringRule,
} from "./actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Recurring Invoices | Slipwise" };

const FREQ_COLORS: Record<string, string> = {
  WEEKLY: "bg-blue-100 text-blue-700",
  MONTHLY: "bg-purple-100 text-purple-700",
  QUARTERLY: "bg-amber-100 text-amber-700",
  YEARLY: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-700",
};

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[label] ?? "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </span>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const page = Number(params.page) || 1;

  const { rules, totalPages } = await listRecurringRules({ status, page });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
            SW&gt; Pay
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Invoices</h1>
        </div>
        <Link href="/app/pay/recurring/new">
          <Button variant="primary" size="sm">
            New Recurring Rule
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "ACTIVE", "PAUSED", "COMPLETED"].map((s) => (
          <a
            key={s}
            href={`/app/pay/recurring${s === "ALL" ? "" : `?status=${s}`}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              (s === "ALL" && !status) || status === s
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--border-strong)]"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {/* Table */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold">No recurring rules yet</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create a recurring rule to automatically generate invoices on a schedule.
          </p>
          <Link href="/app/pay/recurring/new" className="mt-4">
            <Button variant="primary" size="sm">
              Create Your First Rule
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-strong)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-soft)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Base Invoice</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Frequency</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Next Run</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Runs</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Auto-Send</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-[var(--border-strong)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {rule.baseInvoice.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={rule.frequency} colorMap={FREQ_COLORS} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDate(rule.nextRunAt)}
                  </td>
                  <td className="px-4 py-3">{rule.runsCount}</td>
                  <td className="px-4 py-3">
                    <Badge label={rule.status} colorMap={STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-3">
                    {rule.autoSend ? (
                      <span className="text-green-600 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {rule.status === "ACTIVE" && (
                        <form
                          action={async () => {
                            "use server";
                            await pauseRecurringRule(rule.id);
                          }}
                        >
                          <Button variant="secondary" size="sm" type="submit">
                            Pause
                          </Button>
                        </form>
                      )}
                      {rule.status === "PAUSED" && (
                        <form
                          action={async () => {
                            "use server";
                            await resumeRecurringRule(rule.id);
                          }}
                        >
                          <Button variant="secondary" size="sm" type="submit">
                            Resume
                          </Button>
                        </form>
                      )}
                      {rule.status !== "COMPLETED" && (
                        <form
                          action={async () => {
                            "use server";
                            await deleteRecurringRule(rule.id);
                          }}
                        >
                          <Button variant="danger" size="sm" type="submit">
                            Delete
                          </Button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/app/pay/recurring?${status ? `status=${status}&` : ""}page=${p}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                p === page
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--border-strong)]"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
