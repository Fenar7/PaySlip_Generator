"use client";

import { useEffect, useState } from "react";
import { getCrmDashboard } from "./actions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardSection, ContentPanel } from "@/components/dashboard/dashboard-section";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ActivityList, ActivityItem } from "@/components/dashboard/activity-list";
import { Users, Building2, CalendarDays, MessageSquare } from "lucide-react";

type Dashboard = Awaited<ReturnType<typeof getCrmDashboard>>;

const LIFECYCLE_VARIANTS: Record<string, Parameters<typeof StatusBadge>[0]["variant"]> = {
  PROSPECT: "neutral",
  QUALIFIED: "info",
  NEGOTIATION: "warning",
  WON: "success",
  ACTIVE: "success",
  AT_RISK: "warning",
  CHURNED: "danger",
};

const COMPLIANCE_VARIANTS: Record<string, Parameters<typeof StatusBadge>[0]["variant"]> = {
  PENDING: "warning",
  VERIFIED: "success",
  SUSPENDED: "danger",
  BLOCKED: "danger",
};

export default function CrmPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCrmDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--brand-primary)]" />
        Loading CRM dashboard…
      </div>
    );
  }

  const totalCustomers = data?.lifecycleBreakdown.reduce((sum, s) => sum + s._count.id, 0) ?? 0;
  const totalVendors = data?.vendorCompliance.reduce((sum, s) => sum + s._count.id, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">CRM</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Customer lifecycle, vendor compliance, and relationship history
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Customers" value={totalCustomers} icon={Users} />
        <KpiCard label="Total Vendors" value={totalVendors} icon={Building2} />
        <KpiCard label="Follow-ups (7d)" value={data?.upcomingFollowUps.length ?? 0} icon={CalendarDays} />
        <KpiCard label="Recent Notes" value={data?.recentNotes.length ?? 0} icon={MessageSquare} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer Lifecycle */}
        <DashboardSection
          title="Customer Lifecycle"
          action={{ href: "/app/data/customers", label: "View Customers →" }}
        >
          <ContentPanel padding="none">
            {(data?.lifecycleBreakdown ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No customer data yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {(data?.lifecycleBreakdown ?? []).map((s) => (
                  <li
                    key={s.lifecycleStage}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--surface-subtle)]"
                  >
                    <StatusBadge variant={LIFECYCLE_VARIANTS[s.lifecycleStage ?? "PROSPECT"] ?? "neutral"}>
                      {(s.lifecycleStage ?? "UNKNOWN").replace(/_/g, " ")}
                    </StatusBadge>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{s._count.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </ContentPanel>
        </DashboardSection>

        {/* Vendor Compliance */}
        <DashboardSection
          title="Vendor Compliance"
          action={{ href: "/app/data/vendors", label: "View Vendors →" }}
        >
          <ContentPanel padding="none">
            {(data?.vendorCompliance ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No vendor data yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {(data?.vendorCompliance ?? []).map((s) => (
                  <li
                    key={s.complianceStatus}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--surface-subtle)]"
                  >
                    <StatusBadge variant={COMPLIANCE_VARIANTS[s.complianceStatus ?? "PENDING"] ?? "neutral"}>
                      {(s.complianceStatus ?? "PENDING").replace(/_/g, " ")}
                    </StatusBadge>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{s._count.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </ContentPanel>
        </DashboardSection>

        {/* Follow-ups */}
        <DashboardSection title="Upcoming Follow-ups (7 days)">
          <ContentPanel padding="none">
            {(data?.upcomingFollowUps ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No follow-ups scheduled this week.
              </div>
            ) : (
              <ActivityList>
                {(data?.upcomingFollowUps ?? []).map((c) => (
                  <ActivityItem
                    key={c.id}
                    href={`/app/crm/customers/${c.id}`}
                    title={c.name}
                    meta={c.email ?? undefined}
                    badge={
                      <StatusBadge variant={LIFECYCLE_VARIANTS[c.lifecycleStage ?? "PROSPECT"] ?? "neutral"}>
                        {(c.lifecycleStage ?? "PROSPECT").replace(/_/g, " ")}
                      </StatusBadge>
                    }
                    rightText={c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleDateString("en-IN") : "—"}
                  />
                ))}
              </ActivityList>
            )}
          </ContentPanel>
        </DashboardSection>

        {/* Recent Activity */}
        <DashboardSection title="Recent Activity">
          <ContentPanel padding="none">
            {(data?.recentNotes ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No recent notes.
              </div>
            ) : (
              <ActivityList>
                {(data?.recentNotes ?? []).map((n) => (
                  <ActivityItem
                    key={n.id}
                    href={`/app/crm/${n.entityType}s/${n.entityId}`}
                    title={n.content.slice(0, 80)}
                    meta={n.entityType}
                    rightText={new Date(n.createdAt).toLocaleDateString("en-IN")}
                  />
                ))}
              </ActivityList>
            )}
          </ContentPanel>
        </DashboardSection>
      </div>
    </div>
  );
}
