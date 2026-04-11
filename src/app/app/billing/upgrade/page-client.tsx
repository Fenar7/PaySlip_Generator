"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLANS,
  formatPriceInr,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans/config";

interface UpgradePageClientProps {
  orgId: string;
  currentPlanId: PlanId;
  hasManagedSubscription: boolean;
  subscriptionStatus: string | null;
}

export function UpgradePageClient({
  orgId,
  currentPlanId,
  hasManagedSubscription,
  subscriptionStatus,
}: UpgradePageClientProps) {
  const router = useRouter();

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: PlanId) => {
    if (
      planId === "free" ||
      planId === currentPlanId ||
      subscriptionStatus === "pending"
    ) {
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const isPlanChange = currentPlanId !== "free" && hasManagedSubscription;
      const res = await fetch(
        isPlanChange
          ? "/api/billing/razorpay/change-plan"
          : "/api/billing/razorpay/create-subscription",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            ...(isPlanChange ? { newPlanId: planId, immediate: false } : { planId }),
            billingInterval,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update the subscription.");
        return;
      }

      if (data.shortUrl) {
        window.location.href = data.shortUrl;
        return;
      }

      const nextPlan = PLANS.find((plan) => plan.id === planId);
      router.push(
        `/app/billing/success?plan=${encodeURIComponent(nextPlan?.name ?? planId)}&mode=${
          isPlanChange ? "change" : "checkout"
        }`,
      );
      router.refresh();
    } catch (actionError) {
      console.error("Error updating subscription:", actionError);
      setError("Could not update the subscription. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="mt-2 text-gray-500">
          Scale your business with the right plan. All plans include a 14-day
          free trial.
        </p>
        {subscriptionStatus === "pending" ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your checkout is still pending provider confirmation. Wait for
            activation before starting another plan change.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 inline-flex items-center rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingInterval === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingInterval === "yearly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Yearly
            <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price =
            billingInterval === "yearly"
              ? plan.yearlyPriceInr / 12
              : plan.monthlyPriceInr;
          const isCurrent = plan.id === currentPlanId;
          const isDowngrade =
            PLANS.findIndex((p) => p.id === plan.id) <
            PLANS.findIndex((p) => p.id === currentPlanId);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border-2 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                plan.popular
                  ? "border-indigo-600"
                  : isCurrent
                    ? "border-green-500"
                    : "border-gray-200"
              }`}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                  Popular
                </span>
              ) : null}
              {isCurrent ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                  Current Plan
                </span>
              ) : null}

              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPriceInr(price)}
                </span>
                {price > 0 ? (
                  <span className="text-sm text-gray-500">/month</span>
                ) : null}
                {billingInterval === "yearly" && plan.yearlyPriceInr > 0 ? (
                  <p className="mt-1 text-xs text-gray-400">
                    {formatPriceInr(plan.yearlyPriceInr)} billed yearly
                  </p>
                ) : null}
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {getFeatureList(plan.id).map((feature) => (
                  <li key={feature} className="flex items-start text-sm">
                    <svg
                      className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={
                  isCurrent ||
                  plan.id === "free" ||
                  loading === plan.id ||
                  subscriptionStatus === "pending"
                }
                className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "cursor-default border border-green-300 bg-green-50 text-green-700"
                    : plan.id === "free"
                      ? "cursor-default border border-gray-200 bg-gray-50 text-gray-400"
                      : isDowngrade
                        ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                } disabled:opacity-60`}
              >
                {loading === plan.id
                  ? "Processing..."
                  : isCurrent
                    ? "Current Plan"
                    : subscriptionStatus === "pending"
                      ? "Pending Activation"
                    : plan.id === "free"
                      ? "Free"
                      : isDowngrade
                        ? "Downgrade"
                        : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push("/app/billing")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Billing
        </button>
      </div>
    </div>
  );
}

function getFeatureList(planId: PlanId): string[] {
  switch (planId) {
    case "free":
      return [
        "10 invoices/month",
        "10 vouchers/month",
        "5 salary slips/month",
        "100 MB storage",
        "1 team member",
        "20 customers/vendors",
      ];
    case "starter":
      return [
        "100 invoices/month",
        "100 vouchers/month",
        "50 salary slips/month",
        "1 GB storage",
        "5 team members",
        "Custom branding",
        "PDF Studio tools",
      ];
    case "pro":
      return [
        "1,000 invoices/month",
        "1,000 vouchers/month",
        "500 salary slips/month",
        "10 GB storage",
        "25 team members",
        "Approval workflows",
        "Priority support",
      ];
    case "enterprise":
      return [
        "Unlimited invoices",
        "Unlimited vouchers",
        "Unlimited salary slips",
        "100 GB storage",
        "Unlimited team members",
        "API access",
        "Dedicated support",
      ];
  }
}
