import type { Metadata } from "next";
import { countPasskeysForUser } from "@/lib/passkey/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getDashboardData } from "./actions";
import { PasskeyAdoptionPrompt } from "./passkey-adoption-prompt";
import {
  KpiRow,
  RevenueChart,
  DocBreakdownChart,
  ActivitySidebar,
  ModuleGrid,
  RecentDocs,
} from "@/components/dashboard";

export const metadata: Metadata = { title: "Dashboard | Slipwise" };

async function getCurrentUserPasskeyCount(): Promise<number> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 1;
  return countPasskeysForUser(user.id);
}

export default async function AppHomePage() {
  const [dashboardResult, passkeyCount] = await Promise.all([
    getDashboardData(),
    getCurrentUserPasskeyCount(),
  ]);

  const data = dashboardResult.success ? dashboardResult.data : null;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: "#f8f9fc" }}>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "#1C1B1F" }}>
              Dashboard
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "#79747E" }}>
              Workspace overview at a glance
            </p>
          </div>
          {data && (
            <p className="text-xs" style={{ color: "#79747E" }}>
              {data.counts.total} documents · {data.kpis.pay.invoicesIssued} invoices this month
            </p>
          )}
        </div>

        <PasskeyAdoptionPrompt show={passkeyCount === 0} />

        {/* KPI Row */}
        {data && (
          <div className="mb-6">
            <KpiRow counts={data.counts} kpis={{ pay: data.kpis.pay }} />
          </div>
        )}

        {/* Charts + Side panels */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Revenue Chart — spans 8 cols */}
          <div className="lg:col-span-8">
            {data && <RevenueChart data={data.revenueTrend} />}
            {!data && (
              <div
                className="flex h-80 items-center justify-center rounded-2xl border bg-white"
                style={{ borderColor: "#E0E0E0" }}
              >
                <p className="text-sm" style={{ color: "#79747E" }}>
                  Unable to load dashboard data
                </p>
              </div>
            )}
          </div>

          {/* Right column — doc breakdown + activity */}
          <div className="flex flex-col gap-4 lg:col-span-4">
            {data && (
              <>
                <DocBreakdownChart
                  counts={{
                    invoice: data.counts.invoice,
                    voucher: data.counts.voucher,
                    salarySlip: data.counts.salarySlip,
                  }}
                />
                <div className="flex-1">
                  <ActivitySidebar entries={data.recentActivity} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Documents + Module Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            {data && <RecentDocs docs={data.recentDocs} />}
          </div>
          <div className="lg:col-span-8">
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#E0E0E0" }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "#1C1B1F" }}>
                Module Access
              </h2>
              <ModuleGrid />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
