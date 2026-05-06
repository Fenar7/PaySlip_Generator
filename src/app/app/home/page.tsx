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
  QuickActionsRow,
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
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "#1C1B1F" }}>
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#79747E" }}>
            Overview of your workspace
          </p>
        </div>

        <PasskeyAdoptionPrompt show={passkeyCount === 0} />

        {/* KPI Row */}
        {data && (
          <div className="mb-6">
            <KpiRow counts={data.counts} kpis={{ pay: data.kpis.pay }} />
          </div>
        )}

        {/* Charts + Activity */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left column — charts */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {data && (
              <>
                <RevenueChart data={data.revenueTrend} />
                <DocBreakdownChart
                  counts={{
                    invoice: data.counts.invoice,
                    voucher: data.counts.voucher,
                    salarySlip: data.counts.salarySlip,
                  }}
                />
              </>
            )}
            {!data && (
              <div
                className="flex h-64 items-center justify-center rounded-2xl border bg-white"
                style={{ borderColor: "#E0E0E0" }}
              >
                <p className="text-sm" style={{ color: "#79747E" }}>
                  Unable to load dashboard data
                </p>
              </div>
            )}
          </div>

          {/* Right column — activity */}
          <div className="lg:col-span-1">
            {data && (
              <ActivitySidebar entries={data.recentActivity} />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "#1C1B1F" }}>
            Quick Actions
          </h2>
          <QuickActionsRow />
        </div>
      </div>
    </div>
  );
}
