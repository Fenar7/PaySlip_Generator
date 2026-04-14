import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  buildMarketplaceAdminPayoutRun,
  getMarketplaceAdminPayoutOverview,
  holdMarketplaceAdminRevenue,
  releaseMarketplaceAdminRevenueHold,
  verifyMarketplaceAdminBeneficiary,
} from "./actions";

export const metadata = {
  title: "Marketplace Payout Ops | Slipwise",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function badgeVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (["verified", "paid", "completed", "eligible", "approved"].includes(status)) {
    return "success";
  }
  if (["pending", "pending_verification", "processing", "draft", "queued_for_payout"].includes(status)) {
    return "warning";
  }
  if (["failed", "on_hold", "manual_review", "cancelled", "suspended"].includes(status)) {
    return "danger";
  }
  return "default";
}

interface MarketplacePayoutsPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
}

export default async function MarketplacePayoutsPage({
  searchParams,
}: MarketplacePayoutsPageProps) {
  const params = await searchParams;
  const result = await getMarketplaceAdminPayoutOverview({
    status: params.status,
    page: params.page ? Number.parseInt(params.page, 10) : undefined,
  });

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const { runs, summary, eligibleRevenue, heldRevenue, pendingBeneficiaries } =
    result.data;

  async function createRunAction(formData: FormData) {
    "use server";

    const rawMinimumAmount = String(formData.get("minimumAmount") ?? "").trim();
    const notes = String(formData.get("notes") ?? "");
    const minimumAmount = rawMinimumAmount
      ? Number.parseFloat(rawMinimumAmount)
      : undefined;

    const response = await buildMarketplaceAdminPayoutRun({
      minimumAmount:
        minimumAmount !== undefined && Number.isFinite(minimumAmount)
          ? minimumAmount
          : undefined,
      notes,
    });

    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect(`/app/admin/marketplace/payouts/${response.data.payoutRunId}`);
  }

  async function holdRevenueAction(formData: FormData) {
    "use server";

    const revenueId = String(formData.get("revenueId") ?? "");
    const reason = String(formData.get("reason") ?? "");
    const response = await holdMarketplaceAdminRevenue({ revenueId, reason });

    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect("/app/admin/marketplace/payouts?message=revenue_held");
  }

  async function releaseRevenueAction(formData: FormData) {
    "use server";

    const revenueId = String(formData.get("revenueId") ?? "");
    const response = await releaseMarketplaceAdminRevenueHold(revenueId);

    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect("/app/admin/marketplace/payouts?message=revenue_released");
  }

  async function verifyBeneficiaryAction(formData: FormData) {
    "use server";

    const publisherOrgId = String(formData.get("publisherOrgId") ?? "");
    const verificationReference = String(
      formData.get("verificationReference") ?? "",
    );

    const response = await verifyMarketplaceAdminBeneficiary({
      publisherOrgId,
      verificationReference,
    });

    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect("/app/admin/marketplace/payouts?message=beneficiary_verified");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Marketplace Payout Operations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Queue, approve, and reconcile publisher settlements without losing payout traceability.
          </p>
        </div>
        <Link href="/app/docs/templates/marketplace">
          <Button variant="secondary">Marketplace</Button>
        </Link>
      </div>

      {params.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </div>
      )}
      {params.message && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {params.message.replaceAll("_", " ")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Eligible Items", value: String(summary.eligibleItemCount) },
          {
            label: "Eligible Amount",
            value: formatCurrency(summary.eligibleTotalAmount),
          },
          { label: "Held Items", value: String(summary.heldItemCount) },
          {
            label: "Held Amount",
            value: formatCurrency(summary.heldTotalAmount),
          },
          {
            label: "Pending Beneficiaries",
            value: String(summary.pendingBeneficiaryCount),
          },
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
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Build payout run
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Draft a payout run from currently eligible revenue. Approval and execution remain explicit separate steps.
          </p>
        </CardHeader>
        <CardContent>
          <form action={createRunAction} className="grid gap-4 md:grid-cols-[200px_1fr_auto]">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Minimum amount
              </span>
              <input
                type="number"
                name="minimumAmount"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                placeholder="0.00"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Notes</span>
              <input
                type="text"
                name="notes"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                placeholder="Optional operator note for this payout batch"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit">Create Run</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Run history</h2>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Run</th>
                  <th className="px-6 py-3">Totals</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Executed</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {runs.runs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No payout runs exist yet.
                    </td>
                  </tr>
                ) : (
                  runs.runs.map((run) => (
                    <tr key={run.id}>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="font-medium text-slate-900">{run.runNumber}</div>
                        <div className="text-xs text-slate-500">
                          Created {new Date(run.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div>{formatCurrency(run.totalAmount)}</div>
                        <div className="text-xs text-slate-500">
                          {run.itemCount} item{run.itemCount === 1 ? "" : "s"} / {run.successCount} paid / {run.failureCount} failed / {run.manualReviewCount} review
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={badgeVariant(run.status)}>
                          {run.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {run.executedAt
                          ? new Date(run.executedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/app/admin/marketplace/payouts/${run.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Eligible revenue queue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Revenue ready for payout run inclusion.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {eligibleRevenue.length === 0 ? (
              <p className="text-sm text-slate-500">
                No revenue is currently payout-eligible.
              </p>
            ) : (
              eligibleRevenue.map((revenue) => (
                <div
                  key={revenue.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {revenue.publisherOrgName}
                      </p>
                      <p className="text-sm text-slate-500">{revenue.templateName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(revenue.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Eligible {revenue.eligibleAt ? new Date(revenue.eligibleAt).toLocaleString() : "now"}
                      </p>
                    </div>
                  </div>
                  <form action={holdRevenueAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="revenueId" value={revenue.id} />
                    <input
                      name="reason"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      placeholder="Hold reason (governance, compliance, beneficiary review)"
                      required
                    />
                    <Button type="submit" variant="danger">
                      Hold
                    </Button>
                  </form>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Held revenue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Explicitly-held revenue stays operator-visible until a release decision is made.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {heldRevenue.length === 0 ? (
              <p className="text-sm text-slate-500">
                No revenue is currently on hold.
              </p>
            ) : (
              heldRevenue.map((revenue) => (
                <div
                  key={revenue.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {revenue.publisherOrgName}
                      </p>
                      <p className="text-sm text-slate-500">{revenue.templateName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(revenue.amount)}
                      </p>
                      <Badge variant={badgeVariant(revenue.status)}>
                        {revenue.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Reason: {revenue.onHoldReason ?? "—"}
                    </p>
                    <form action={releaseRevenueAction}>
                      <input type="hidden" name="revenueId" value={revenue.id} />
                      <Button type="submit" variant="secondary">
                        Release Hold
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Beneficiaries pending verification
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Payout onboarding stays blocked until finance explicitly verifies the publisher destination.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingBeneficiaries.length === 0 ? (
            <p className="text-sm text-slate-500">
              All known payout beneficiaries are verified.
            </p>
          ) : (
            pendingBeneficiaries.map((row) => (
              <div
                key={row.publisherOrgId}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {row.publisherOrgName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {row.beneficiary?.accountHolderName ?? "Unknown account holder"} •{" "}
                      {row.beneficiary?.bankAccountMasked ?? "No masked account"}
                    </p>
                  </div>
                  <Badge variant={badgeVariant(row.beneficiary?.status ?? "default")}>
                    {row.beneficiary?.status?.replaceAll("_", " ") ?? "unknown"}
                  </Badge>
                </div>
                <form
                  action={verifyBeneficiaryAction}
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    type="hidden"
                    name="publisherOrgId"
                    value={row.publisherOrgId}
                  />
                  <input
                    name="verificationReference"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    placeholder="Optional verification reference"
                  />
                  <Button type="submit">Verify Beneficiary</Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
