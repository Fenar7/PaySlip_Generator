import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/multi-org";
import { redirect } from "next/navigation";
import { getPlan, formatPriceInr } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/config";
import Link from "next/link";
import { BillingPageActions } from "./billing-actions";

export default async function BillingPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const activeOrg = await getActiveOrg(user.id);
  if (!activeOrg) redirect("/onboarding");

  const sub = await db.subscription.findUnique({
    where: { orgId: activeOrg.id },
    select: {
      planId: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      pauseReason: true,
      pausedUntil: true,
      razorpayCustomerId: true,
    },
  });

  const planId = (sub?.planId ?? "free") as PlanId;
  const plan = getPlan(planId);
  const status = sub?.status ?? "active";

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    past_due: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    paused: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Billing &amp; Subscription
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your plan, billing, and payment details.
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Current Plan
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">
                {plan.name}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? statusColors.active}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPriceInr(plan.monthlyPriceInr)}
            </div>
            {plan.monthlyPriceInr > 0 && (
              <span className="text-sm text-gray-500">/month</span>
            )}
          </div>
        </div>

        {status === "trialing" && sub?.trialEndsAt && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              🕐 Trial ends on{" "}
              <strong>
                {new Date(sub.trialEndsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              . Upgrade to continue using premium features.
            </p>
          </div>
        )}

        {planId === "free" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              ✨ Upgrade to unlock more invoices, team members, and advanced
              features.
            </p>
          </div>
        )}

        {status === "pending" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              Your billing checkout has been created and is waiting for provider
              confirmation. Paid feature limits stay on your current plan until
              Razorpay confirms activation.
            </p>
          </div>
        )}

        {status === "paused" && (
          <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm text-orange-800">
              ⏸ Your subscription is paused
              {sub?.pauseReason && <> — {sub.pauseReason}</>}.
              {sub?.pausedUntil && (
                <>
                  {" "}
                  Auto-resumes on{" "}
                  <strong>
                    {new Date(sub.pausedUntil).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  .
                </>
              )}
            </p>
          </div>
        )}

        {sub?.currentPeriodEnd && (
          <p className="mt-3 text-sm text-gray-500">
            Next billing date:{" "}
            {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Usage Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Usage Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Invoices",
              limit:
                plan.limits.invoicesPerMonth === -1
                  ? "Unlimited"
                  : plan.limits.invoicesPerMonth,
            },
            {
              label: "Vouchers",
              limit:
                plan.limits.vouchersPerMonth === -1
                  ? "Unlimited"
                  : plan.limits.vouchersPerMonth,
            },
            {
              label: "Salary Slips",
              limit:
                plan.limits.salarySlipsPerMonth === -1
                  ? "Unlimited"
                  : plan.limits.salarySlipsPerMonth,
            },
            {
              label: "Storage",
              limit: `${Math.round(plan.limits.storageBytes / (1024 * 1024))} MB`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {item.limit}
                {typeof item.limit === "number" && (
                  <span className="text-sm font-normal text-gray-500">
                    /mo
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Subscription */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Manage Subscription
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/app/billing/upgrade"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {planId === "free" ? "Upgrade Plan" : "Change Plan"}
          </Link>
          {planId !== "free" && status !== "cancelled" && (
            <Link
              href="/app/billing/cancel"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel Subscription
            </Link>
          )}
          <BillingPageActions
            orgId={activeOrg.id}
            canPause={planId !== "free" && status === "active"}
            canResume={status === "paused"}
          />
        </div>
      </div>

      {/* Billing History */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Billing History
          </h2>
          <Link
            href="/app/billing/history"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            View all →
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Payment history will appear here once you have an active subscription.
        </p>
      </div>

      {/* Payment Method */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
        {sub?.razorpayCustomerId ? (
          <p className="mt-2 text-sm text-gray-500">
            Managed via Razorpay. Payment details are securely stored by
            Razorpay.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No payment method on file. Add one when you upgrade your plan.
          </p>
        )}
      </div>
    </div>
  );
}
