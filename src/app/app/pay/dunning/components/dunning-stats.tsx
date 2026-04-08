import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/require-org";

export async function DunningStats() {
  const { orgId } = await requireOrgContext();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [sequenceCount, sentCount, totalLogCount, optOutCount] =
    await Promise.all([
      db.dunningSequence.count({
        where: { orgId, isActive: true },
      }),
      db.dunningLog.count({
        where: { orgId, status: "SENT", createdAt: { gte: thirtyDaysAgo } },
      }),
      db.dunningLog.count({
        where: { orgId, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.dunningOptOut.count({
        where: { orgId },
      }),
    ]);

  const successRate =
    totalLogCount > 0 ? Math.round((sentCount / totalLogCount) * 100) : 0;

  const stats = [
    {
      label: "Active Sequences",
      value: sequenceCount,
      icon: "🔄",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Reminders Sent (30d)",
      value: sentCount,
      icon: "📨",
      bg: "bg-green-50 border-green-200",
    },
    {
      label: "Opt-Outs",
      value: optOutCount,
      icon: "🚫",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Success Rate (30d)",
      value: `${successRate}%`,
      icon: "📈",
      bg: "bg-purple-50 border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className={`rounded-lg border p-5 ${stat.bg}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl" aria-hidden="true">
              {stat.icon}
            </span>
            <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
