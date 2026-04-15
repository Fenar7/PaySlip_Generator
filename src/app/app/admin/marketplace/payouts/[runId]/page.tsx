import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { canManuallyResolveMarketplacePayoutItem } from "@/lib/payouts/constants";
import {
  approveMarketplaceAdminPayoutRun,
  executeMarketplaceAdminPayoutRun,
  getMarketplaceAdminPayoutRun,
  recordMarketplaceAdminPayoutItemFailure,
  recordMarketplaceAdminPayoutItemPaid,
} from "../actions";

export const metadata = {
  title: "Marketplace Payout Run | Slipwise",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function badgeVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (["verified", "paid", "completed", "approved"].includes(status)) {
    return "success";
  }
  if (["pending", "processing", "manual_review", "draft"].includes(status)) {
    return "warning";
  }
  if (["failed", "on_hold", "cancelled"].includes(status)) {
    return "danger";
  }
  return "default";
}

interface MarketplacePayoutRunPageProps {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
}

export default async function MarketplacePayoutRunPage({
  params,
  searchParams,
}: MarketplacePayoutRunPageProps) {
  const { runId } = await params;
  const pageParams = await searchParams;
  const result = await getMarketplaceAdminPayoutRun(runId);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const run = result.data;

  async function approveAction() {
    "use server";

    const response = await approveMarketplaceAdminPayoutRun(run.id);
    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts/${run.id}?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect(`/app/admin/marketplace/payouts/${run.id}?message=run_approved`);
  }

  async function executeAction() {
    "use server";

    const response = await executeMarketplaceAdminPayoutRun(run.id);
    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts/${run.id}?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect(`/app/admin/marketplace/payouts/${run.id}?message=run_executed`);
  }

  async function markPaidAction(formData: FormData) {
    "use server";

    const response = await recordMarketplaceAdminPayoutItemPaid({
      payoutRunId: run.id,
      payoutItemId: String(formData.get("payoutItemId") ?? ""),
      externalReferenceId: String(formData.get("externalReferenceId") ?? ""),
      providerReferenceId: String(formData.get("providerReferenceId") ?? ""),
      note: String(formData.get("note") ?? ""),
    });

    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts/${run.id}?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect(`/app/admin/marketplace/payouts/${run.id}?message=item_paid`);
  }

  async function markFailedAction(formData: FormData) {
    "use server";

    const response = await recordMarketplaceAdminPayoutItemFailure({
      payoutRunId: run.id,
      payoutItemId: String(formData.get("payoutItemId") ?? ""),
      failureCode: String(formData.get("failureCode") ?? ""),
      failureMessage: String(formData.get("failureMessage") ?? ""),
    });

    if (!response.success) {
      redirect(
        `/app/admin/marketplace/payouts/${run.id}?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect(`/app/admin/marketplace/payouts/${run.id}?message=item_failed`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/app/admin/marketplace/payouts"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Marketplace Payout Ops
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {run.runNumber}
            </h1>
            <Badge variant={badgeVariant(run.status)}>
              {run.status.replaceAll("_", " ")}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {run.status === "draft" && (
            <form action={approveAction}>
              <Button type="submit">Approve Run</Button>
            </form>
          )}
          {(run.status === "approved" || run.status === "failed") && (
            <form action={executeAction}>
              <Button type="submit" variant="secondary">
                Execute Run
              </Button>
            </form>
          )}
        </div>
      </div>

      {pageParams.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(pageParams.error)}
        </div>
      )}
      {pageParams.message && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {pageParams.message.replaceAll("_", " ")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Amount", value: formatCurrency(run.totalAmount) },
          { label: "Item Count", value: String(run.itemCount) },
          { label: "Paid", value: String(run.successCount) },
          { label: "Failed", value: String(run.failureCount) },
          { label: "Manual Review", value: String(run.manualReviewCount) },
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
          <h2 className="text-lg font-semibold text-slate-900">Run metadata</h2>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Provider
            </p>
            <p className="mt-1 text-sm text-slate-900">{run.providerName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Approved
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {run.approvedAt ? new Date(run.approvedAt).toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Executed
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {run.executedAt ? new Date(run.executedAt).toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Notes
            </p>
            <p className="mt-1 text-sm text-slate-900">{run.notes ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Run items</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manual review items remain visible until finance records a final paid or failed outcome.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {run.items.map((item) => (
            (() => {
              const canManuallyResolve = canManuallyResolveMarketplacePayoutItem(
                run.status,
                item.status,
              );

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">
                        {item.publisherOrgName}
                      </p>
                      <p className="text-sm text-slate-500">{item.templateName}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={badgeVariant(item.status)}>
                          {item.status.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant={badgeVariant(item.revenueStatus)}>
                          revenue {item.revenueStatus.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant={badgeVariant(item.beneficiaryStatus)}>
                          beneficiary {item.beneficiaryStatus.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(item.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Attempts {item.attemptCount}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.externalReferenceId ??
                          item.providerReferenceId ??
                          item.failureMessage ??
                          item.manualReviewReason ??
                          "No external reference yet"}
                      </p>
                    </div>
                  </div>

                  {canManuallyResolve && (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <form action={markPaidAction} className="rounded-xl border border-green-200 p-4">
                        <input type="hidden" name="payoutItemId" value={item.id} />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Record paid outcome
                        </h3>
                        <div className="mt-3 space-y-3">
                          <input
                            name="externalReferenceId"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                            placeholder="External bank/reference ID"
                            required
                          />
                          <input
                            name="providerReferenceId"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                            placeholder="Provider reference (optional)"
                          />
                          <input
                            name="note"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                            placeholder="Optional operator note"
                          />
                          <Button type="submit" size="sm">
                            Mark Paid
                          </Button>
                        </div>
                      </form>

                      <form action={markFailedAction} className="rounded-xl border border-red-200 p-4">
                        <input type="hidden" name="payoutItemId" value={item.id} />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Record failed outcome
                        </h3>
                        <div className="mt-3 space-y-3">
                          <input
                            name="failureCode"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                            placeholder="Failure code (optional)"
                          />
                          <input
                            name="failureMessage"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                            placeholder="Failure reason"
                            required
                          />
                          <Button type="submit" size="sm" variant="danger">
                            Mark Failed
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })()
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
