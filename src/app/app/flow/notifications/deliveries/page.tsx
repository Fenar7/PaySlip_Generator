import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { replayDeliveryAction } from "../delivery-actions";
import {
  Mail,
  Bell,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Delivery Console — Flow Notifications",
};

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
  SENDING: "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
  SENT: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
  FAILED: "bg-orange-100 text-orange-600 dark:bg-orange-900/30",
  TERMINAL_FAILURE: "bg-red-100 text-red-600 dark:bg-red-900/30",
  REPLAYED: "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  QUEUED: <Clock className="w-3 h-3" />,
  SENDING: <RefreshCw className="w-3 h-3 animate-spin" />,
  SENT: <CheckCircle2 className="w-3 h-3" />,
  DELIVERED: <CheckCircle2 className="w-3 h-3" />,
  FAILED: <AlertTriangle className="w-3 h-3" />,
  TERMINAL_FAILURE: <XCircle className="w-3 h-3" />,
  REPLAYED: <RotateCcw className="w-3 h-3" />,
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  in_app: <Bell className="w-3.5 h-3.5" />,
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    channel?: string;
    sourceModule?: string;
    page?: string;
  }>;
}

export default async function DeliveryConsolePage({ searchParams }: PageProps) {
  const { orgId } = await requireOrgContext();
  const params = await searchParams;

  const page = parseInt(params.page ?? "0", 10);
  const PAGE_SIZE = 25;

  const where = {
    orgId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.channel ? { channel: params.channel as never } : {}),
    ...(params.sourceModule ? { sourceModule: params.sourceModule } : {}),
  };

  const [deliveries, total, stats] = await Promise.all([
    db.notificationDelivery.findMany({
      where,
      orderBy: { queuedAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        channel: true,
        recipientTarget: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
        sourceModule: true,
        sourceRef: true,
        queuedAt: true,
        sentAt: true,
        failedAt: true,
        nextRetryAt: true,
        failureReason: true,
        replayedAt: true,
        replayedFromId: true,
        notification: {
          select: { id: true, title: true, type: true, link: true },
        },
      },
    }),
    db.notificationDelivery.count({ where }),
    db.notificationDelivery.groupBy({
      by: ["status"],
      where: { orgId },
      _count: { id: true },
    }),
  ]);

  const statMap = Object.fromEntries(
    stats.map((s) => [s.status, s._count.id])
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const canReplay = (status: string) =>
    status === "FAILED" || status === "TERMINAL_FAILURE";

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Console</h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            Monitor outbound email and in-app notification delivery, inspect failures, and replay stuck deliveries.
          </p>
        </div>
        <span className="text-sm text-[var(--muted-foreground)]">
          {total.toLocaleString()} record{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Queued", key: "QUEUED", color: "text-zinc-500" },
          { label: "Sent", key: "SENT", color: "text-emerald-600" },
          { label: "Delivered", key: "DELIVERED", color: "text-emerald-700" },
          { label: "Failed", key: "FAILED", color: "text-orange-500" },
          { label: "Terminal", key: "TERMINAL_FAILURE", color: "text-red-600" },
          { label: "Replayed", key: "REPLAYED", color: "text-purple-500" },
        ].map((s) => (
          <div
            key={s.key}
            className="border rounded-xl p-3 bg-white dark:bg-zinc-900 shadow-sm text-center"
          >
            <p className={`text-2xl font-bold ${s.color}`}>
              {(statMap[s.key] ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 items-center">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {["QUEUED", "SENDING", "SENT", "DELIVERED", "FAILED", "TERMINAL_FAILURE", "REPLAYED"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>

        <select
          name="channel"
          defaultValue={params.channel ?? ""}
          className="px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="in_app">In-App</option>
        </select>

        <input
          name="sourceModule"
          defaultValue={params.sourceModule ?? ""}
          placeholder="Source module…"
          className="px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
        />

        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition"
        >
          Filter
        </button>
        <a
          href="/app/flow/notifications/deliveries"
          className="text-sm text-[var(--muted-foreground)] hover:underline"
        >
          Clear
        </a>
      </form>

      {/* Table */}
      {deliveries.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <p className="font-medium text-lg">No deliveries matching filters</p>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Deliveries will appear here as notifications are sent.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Notification</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Channel</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Recipient</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Attempts</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Time</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Failure</th>
                <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm truncate max-w-[180px]">
                      {d.notification.title}
                    </div>
                    {d.sourceModule && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {d.sourceModule}
                        {d.sourceRef ? ` · ${d.sourceRef}` : ""}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      {CHANNEL_ICON[d.channel]}
                      {d.channel}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] max-w-[140px] truncate">
                    {d.recipientTarget}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        STATUS_STYLES[d.status] ?? "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {STATUS_ICON[d.status]}
                      {d.status.replace("_", " ")}
                    </span>
                    {d.replayedFromId && (
                      <div className="text-[10px] text-purple-500 mt-0.5">replay</div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center text-sm">
                    <span
                      className={
                        d.attemptCount >= d.maxAttempts
                          ? "text-red-500 font-semibold"
                          : "text-[var(--muted-foreground)]"
                      }
                    >
                      {d.attemptCount}/{d.maxAttempts}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {d.failedAt
                      ? formatDistanceToNow(d.failedAt, { addSuffix: true })
                      : d.sentAt
                      ? formatDistanceToNow(d.sentAt, { addSuffix: true })
                      : formatDistanceToNow(d.queuedAt, { addSuffix: true })}
                    {d.nextRetryAt && d.status === "FAILED" && (
                      <div className="text-blue-500 mt-0.5">
                        retry {formatDistanceToNow(d.nextRetryAt, { addSuffix: true })}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 max-w-[200px]">
                    {d.failureReason ? (
                      <span
                        className="text-xs text-red-500 dark:text-red-400 truncate block"
                        title={d.failureReason}
                      >
                        {d.failureReason}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {d.notification.link && (
                        <a
                          href={d.notification.link}
                          className="text-xs text-[var(--muted-foreground)] hover:text-foreground"
                          title="View source"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {canReplay(d.status) && (
                        <form action={replayDeliveryAction.bind(null, d.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Replay
                          </button>
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
        <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 0 && (
              <a
                href={`/app/flow/notifications/deliveries?page=${page - 1}${params.status ? `&status=${params.status}` : ""}${params.channel ? `&channel=${params.channel}` : ""}`}
                className="px-3 py-1.5 rounded-md border hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Previous
              </a>
            )}
            {page < totalPages - 1 && (
              <a
                href={`/app/flow/notifications/deliveries?page=${page + 1}${params.status ? `&status=${params.status}` : ""}${params.channel ? `&channel=${params.channel}` : ""}`}
                className="px-3 py-1.5 rounded-md border hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
