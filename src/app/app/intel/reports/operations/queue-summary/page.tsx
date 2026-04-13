import type { Metadata } from "next";
import Link from "next/link";
import { getQueueSummary, createIntelReportSnapshot } from "../actions";
import { requireOrgContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Queue Summary | Reports",
};

export default async function QueueSummaryReport() {
  const { orgId, userId } = await requireOrgContext();
  const summary = await getQueueSummary();

  // Handle Snapshot Generation
  const handleSnapshot = async () => {
    "use server";
    await createIntelReportSnapshot({
      orgId,
      userId,
      reportType: "flow.queue_summary",
      filters: {},
      rowCount: 1, // Single summary row conceptually
    });
    // In a real app, might redirect or show toast. We'll rely on server action for simplicity.
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Queue Summary Report</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time health of operational queues and flows.</p>
        </div>
        <form action={handleSnapshot}>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Export Snapshot
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Pending Approvals" value={summary.pendingApprovals} />
        <MetricCard title="Overdue Approvals" value={summary.overdueApprovals} isDanger={summary.overdueApprovals > 0} />
        <MetricCard title="Open Tickets" value={summary.openTickets} />
        <MetricCard title="Breached Tickets" value={summary.breachedTickets} isDanger={summary.breachedTickets > 0} />
        <MetricCard title="Pending Scheduled Actions" value={summary.pendingScheduledActions} />
        <MetricCard title="Dead Lettered Actions" value={summary.deadLetteredActions} isDanger={summary.deadLetteredActions > 0} />
        <MetricCard title="Failed Deliveries" value={summary.failedDeliveries} isDanger={summary.failedDeliveries > 0} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, isDanger }: { title: string; value: number; isDanger?: boolean }) {
  return (
    <div className={`rounded-xl border p-6 ${isDanger ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-white"}`}>
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
