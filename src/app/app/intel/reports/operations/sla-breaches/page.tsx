import type { Metadata } from "next";
import { getSlaBreachAnalytics, createIntelReportSnapshot } from "../actions";
import { requireOrgContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SLA Breaches | Reports",
};

export default async function SlaBreachesReport(
  { searchParams }: { searchParams: Promise<{ category?: string; priority?: string }> }
) {
  const { orgId, userId } = await requireOrgContext();
  
  const resolvedParams = await searchParams;
  const breaches = await getSlaBreachAnalytics({
    category: resolvedParams.category,
    priority: resolvedParams.priority,
  });

  const handleSnapshot = async () => {
    "use server";
    await createIntelReportSnapshot({
      orgId,
      userId,
      reportType: "flow.sla_breaches",
      filters: resolvedParams,
      rowCount: breaches.length,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SLA Breach Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Analysis of ticket SLA breaches.</p>
        </div>
        <form action={handleSnapshot}>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Export Snapshot
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Breach Type</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {breaches.map((ticket) => (
              <tr key={ticket.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-mono">
                  {ticket.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{ticket.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ticket.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{ticket.breachType || 'UNKNOWN'}</td>
              </tr>
            ))}
            {breaches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No breaches found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
