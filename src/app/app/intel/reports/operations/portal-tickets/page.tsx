import type { Metadata } from "next";
import { getPortalTicketOperationsAnalytics, createIntelReportSnapshot } from "../actions";
import { requireOrgContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Portal Ticket Operations | Reports",
};

export default async function PortalTicketOperationsReport(
  { searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }
) {
  const { orgId, userId } = await requireOrgContext();
  
  const resolvedParams = await searchParams;
  const tickets = await getPortalTicketOperationsAnalytics({
    dateFrom: resolvedParams.dateFrom,
    dateTo: resolvedParams.dateTo,
  });

  const handleSnapshot = async () => {
    "use server";
    await createIntelReportSnapshot({
      orgId,
      userId,
      reportType: "portal.ticket_operations",
      filters: resolvedParams,
      rowCount: tickets.length,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal Ticket Operations</h1>
          <p className="mt-1 text-sm text-slate-500">Customer portal ticketing performance and usage.</p>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">First Response</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resolution Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tickets.map((ticket) => {
              const customerReplies = ticket.replies.filter(r => r.portalCustomerId).length;
              let firstResText = "N/A";
              if (ticket.firstRespondedAt) {
                 const diff = new Date(ticket.firstRespondedAt).getTime() - new Date(ticket.createdAt).getTime();
                 firstResText = `${Math.floor(diff / 60000)} mins`;
              }
              let resTimeText = "Unresolved";
              if (ticket.resolvedAt) {
                 const diff = new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
                 resTimeText = `${(diff / 3600000).toFixed(1)} hrs`;
              }

              return (
                <tr key={ticket.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                    {ticket.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{ticket.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{firstResText}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{resTimeText}</td>
                </tr>
              );
            })}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No ticket operations found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
