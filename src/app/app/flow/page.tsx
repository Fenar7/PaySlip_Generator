import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, FileCheck2, Activity, ShieldAlert, Clock } from "lucide-react";

export const metadata: Metadata = { title: "SW Flow Control Center" };

export default function FlowPage() {
  return (
    <div className="flex flex-col flex-1 p-6 gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flow Control Center</h1>
          <p className="text-[var(--muted-foreground)] mt-2">
            Manage approvals, SLAs, escalations, and automated jobs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approvals */}
        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-medium">
            <FileCheck2 className="w-4 h-4" />
            <span>Pending Approvals</span>
          </div>
          <div className="text-3xl font-bold">0</div>
          <p className="text-xs text-[var(--muted-foreground)]"><Link href="/app/flow/approvals" className="hover:underline text-blue-600 dark:text-blue-400">View Queue →</Link></p>
        </div>

        {/* Tickets */}
        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Open Tickets</span>
          </div>
          <div className="text-3xl font-bold">0</div>
          <p className="text-xs text-[var(--muted-foreground)]"><Link href="/app/flow/tickets" className="hover:underline text-blue-600 dark:text-blue-400">View Tickets →</Link></p>
        </div>

        {/* Overdue/SLA Breach */}
        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm border-rose-100 dark:border-rose-900">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 font-medium">
            <Clock className="w-4 h-4" />
            <span>SLA Breaches</span>
          </div>
          <div className="text-3xl font-bold">0</div>
          <p className="text-xs text-[var(--muted-foreground)]">Requires intervention</p>
        </div>

        {/* Dead Letter/Failed Jobs */}
        <div className="border rounded-xl p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm border-orange-100 dark:border-orange-900">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-medium">
            <ShieldAlert className="w-4 h-4" />
            <span>Dead-Lettered Actions</span>
          </div>
          <div className="text-3xl font-bold">0</div>
          <p className="text-xs text-[var(--muted-foreground)]"><Link href="/app/flow/jobs" className="hover:underline text-orange-600 dark:text-orange-500">View Jobs →</Link></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Recent Activity */}
        <div className="border rounded-xl p-5 flex flex-col gap-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Workflow Activity
          </div>
          <div className="text-sm text-[var(--muted-foreground)] h-full flex flex-col justify-center">
            <p className="py-12 text-center border-dashed border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50">No recent flow activity.</p>
          </div>
        </div>

        {/* Recent Escalations */}
        <div className="border rounded-xl p-5 flex flex-col gap-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <ShieldAlert className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Recent Escalations
          </div>
          <div className="text-sm text-[var(--muted-foreground)] h-full flex flex-col justify-center">
            <p className="py-12 text-center border-dashed border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50">No active escalations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
