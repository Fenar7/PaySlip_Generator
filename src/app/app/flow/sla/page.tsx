import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Clock, Plus, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "SLA Policies — Flow" };

export default async function SlaPage() {
  const { orgId } = await requireOrgContext();

  const [slaPolicies, breachedCount] = await Promise.all([
    db.ticketSlaPolicy.findMany({
      where: { orgId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    db.invoiceTicket.count({
      where: { orgId, breachedAt: { not: null }, status: { not: "RESOLVED" } },
    }),
  ]);

  return (
    <div className="flex flex-col flex-1 p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SLA Policies</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Configure service level targets for ticket first response and resolution.
          </p>
        </div>
      </div>

      {breachedCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {breachedCount} ticket{breachedCount !== 1 ? "s" : ""} currently in breach
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              These tickets have exceeded their SLA targets and require immediate attention.
            </p>
          </div>
          <Link
            href="/app/flow/tickets?filter=breached"
            className="ml-auto text-xs text-red-700 dark:text-red-400 hover:underline font-medium"
          >
            View Breached →
          </Link>
        </div>
      )}

      {slaPolicies.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3 opacity-50" />
          <p className="font-medium text-lg">No SLA policies configured</p>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            SLA policies automatically compute deadlines when tickets are created or updated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slaPolicies.map((policy) => (
            <div
              key={policy.id}
              className="border rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{policy.name}</p>
                  {policy.category && (
                    <p className="text-xs text-[var(--muted-foreground)]">{policy.category}</p>
                  )}
                </div>
                {policy.isDefault && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 uppercase tracking-wide">
                    Default
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">First Response</p>
                  <p className="font-bold text-base">{Math.floor(policy.firstResponseTargetMins / 60)}h</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Resolution</p>
                  <p className="font-bold text-base">{Math.floor(policy.resolutionTargetMins / 60)}h</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                {policy.businessHoursOnly ? (
                  <><CheckCircle2 className="w-3 h-3 text-blue-500" /> Business hours only</>
                ) : (
                  <><Clock className="w-3 h-3" /> Calendar days</>
                )}
              </div>
            </div>
          ))}

          <div className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-[var(--muted-foreground)] cursor-pointer hover:border-blue-300 transition-colors">
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Add SLA Policy</span>
            <span className="text-xs text-center">Configure via API or admin settings</span>
          </div>
        </div>
      )}
    </div>
  );
}
