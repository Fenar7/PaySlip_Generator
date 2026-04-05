import type { Metadata } from "next";
import { listSendLog, retrySend } from "./actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Send Log | Slipwise" };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function SendLogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const page = Number(params.page) || 1;

  const { records, totalPages } = await listSendLog({ status, page });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
          SW&gt; Pay
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Send Log</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "PENDING", "SENT", "FAILED"].map((s) => (
          <a
            key={s}
            href={`/app/pay/send-log${s === "ALL" ? "" : `?status=${s}`}`}
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
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[var(--muted-foreground)]">No send records found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-strong)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-soft)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Recipient Email</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Scheduled At</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Sent At</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Fail Reason</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-[var(--border-strong)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {record.invoice.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">{record.recipientEmail}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDate(record.scheduledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDate(record.sentAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600">
                    {record.failReason || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {record.status === "FAILED" && (
                      <form
                        action={async () => {
                          "use server";
                          await retrySend(record.id);
                        }}
                      >
                        <Button variant="secondary" size="sm" type="submit">
                          Retry
                        </Button>
                      </form>
                    )}
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
              href={`/app/pay/send-log?${status ? `status=${status}&` : ""}page=${p}`}
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
