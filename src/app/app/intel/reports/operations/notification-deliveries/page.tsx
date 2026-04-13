import type { Metadata } from "next";
import { getNotificationDeliveryAnalytics, createIntelReportSnapshot } from "../actions";
import { requireOrgContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Notification Deliveries | Reports",
};

export default async function NotificationDeliveriesReport(
  { searchParams }: { searchParams: Promise<{ channel?: string; status?: string }> }
) {
  const { orgId, userId } = await requireOrgContext();
  
  const resolvedParams = await searchParams;
  const deliveries = await getNotificationDeliveryAnalytics({
    channel: resolvedParams.channel,
    status: resolvedParams.status,
  });

  const handleSnapshot = async () => {
    "use server";
    await createIntelReportSnapshot({
      orgId,
      userId,
      reportType: "flow.notification_deliveries",
      filters: resolvedParams,
      rowCount: deliveries.length,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notification Delivery Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Message deliverability analysis across channels.</p>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Channel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Source Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Attempts</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                  {delivery.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(delivery.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {delivery.channel}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{delivery.notification.entityType || 'UNKNOWN'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${delivery.status === 'SENT' ? 'bg-green-100 text-green-800' : delivery.status === 'FAILED' || delivery.status === 'TERMINAL_FAILURE' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {delivery.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{delivery.attemptCount}</td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No delivery records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
