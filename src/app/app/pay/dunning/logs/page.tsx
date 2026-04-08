import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getDunningLogs } from "../actions";

export const metadata = {
  title: "Dunning Logs | Slipwise",
};

const STATUS_VARIANT: Record<string, "success" | "danger" | "warning"> = {
  SENT: "success",
  FAILED: "danger",
  SKIPPED: "warning",
};

async function LogsTable({ status }: { status?: string }) {
  const result = await getDunningLogs();

  if (!result.success) {
    return <p className="py-8 text-center text-red-500">{result.error}</p>;
  }

  let logs = result.data;

  // Client-side status filter since the action returns all logs
  if (status && ["SENT", "FAILED", "SKIPPED"].includes(status)) {
    logs = logs.filter((l) => l.status === status);
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">
            📜
          </span>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No dunning logs</h3>
        <p className="mt-1 text-sm text-slate-500">
          Logs will appear here once dunning sequences run.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Invoice
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Step
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Channel
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/app/docs/invoices/${log.invoiceId}`}
                    className="font-medium text-blue-600 hover:underline text-sm"
                  >
                    {log.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {log.customerName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  #{log.stepNumber}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-600 uppercase">
                    {log.channel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[log.status] || "default"}>
                    {log.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                  {log.errorMessage || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusFilterChips({ current }: { current?: string }) {
  const statuses = [
    { value: "", label: "All" },
    { value: "SENT", label: "Sent" },
    { value: "FAILED", label: "Failed" },
    { value: "SKIPPED", label: "Skipped" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Link
          key={s.value}
          href={s.value ? `?status=${s.value}` : "/app/pay/dunning/logs"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            current === s.value || (!current && !s.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export default async function DunningLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dunning Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Activity history for all dunning reminders
        </p>
      </div>

      <div className="mb-4">
        <StatusFilterChips current={params.status} />
      </div>

      <Suspense
        fallback={
          <div className="py-8 text-center text-slate-500">
            Loading logs…
          </div>
        }
      >
        <LogsTable status={params.status} />
      </Suspense>
    </div>
  );
}
