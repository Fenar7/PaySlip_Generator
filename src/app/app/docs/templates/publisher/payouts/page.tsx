import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPublisherPayoutDashboard } from "./actions";

export const metadata = {
  title: "Publisher Payouts | Slipwise",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function payoutBadgeVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "verified" || status === "paid") {
    return "success";
  }
  if (status === "pending_verification" || status === "pending" || status === "queued_for_payout") {
    return "warning";
  }
  if (status === "failed" || status === "on_hold") {
    return "danger";
  }
  return "default";
}

export default async function PublisherPayoutsPage() {
  const result = await getPublisherPayoutDashboard();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const { summary, history } = result.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Publisher Payouts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review payout readiness, beneficiary verification, and settlement history for marketplace revenue.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="/api/export/marketplace-payouts">
            <Button variant="secondary">Download Statement</Button>
          </a>
          <Link href="/app/docs/templates/publisher/payouts/setup">
            <Button>Manage Payout Setup</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Earned", value: formatCurrency(summary.totalEarned) },
          { label: "Pending", value: formatCurrency(summary.amountPending) },
          { label: "On Hold", value: formatCurrency(summary.amountOnHold) },
          { label: "Paid", value: formatCurrency(summary.amountPaid) },
          { label: "Failed", value: formatCurrency(summary.amountFailed) },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-slate-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Beneficiary readiness
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Revenue only becomes payout-eligible after the configured beneficiary is verified.
            </p>
          </div>
          <Badge variant={payoutBadgeVariant(summary.beneficiary?.status ?? "default")}>
            {summary.beneficiary?.status?.replaceAll("_", " ") ?? "not configured"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Account holder
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {summary.beneficiary?.accountHolderName ?? "Not configured"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Payout method
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {summary.beneficiary?.payoutMethod?.replaceAll("_", " ") ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Account mask
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {summary.beneficiary?.bankAccountMasked ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Last paid
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {summary.lastPaidAt
                ? new Date(summary.lastPaidAt).toLocaleString()
                : "No completed payouts yet"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Payout history
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Showing the latest 50 payout items here. Download Statement exports the full payout history.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Run</th>
                  <th className="px-6 py-3">Template</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Settled</th>
                  <th className="px-6 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No payout items exist yet for this publisher organization.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.payoutItemId}>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="font-medium text-slate-900">
                          {item.payoutRunNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {item.templateName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={payoutBadgeVariant(item.status)}>
                          {item.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {item.settledAt
                          ? new Date(item.settledAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {item.externalReferenceId ??
                          item.failureMessage ??
                          "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
