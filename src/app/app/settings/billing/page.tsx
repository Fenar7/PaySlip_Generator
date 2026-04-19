"use client";

/**
 * Phase 28.1: Subscription Management Portal
 *
 * Allows org admins to manage their subscription plan, view billing
 * history, and handle payment issues.
 */

import { useState, useEffect } from "react";
import { getBillingDashboardData, initiatePlanCheckoutAction, cancelSubscriptionAction } from "./actions";

const PLANS = [
  { id: "free", name: "Free", priceMonthly: 0, priceYearly: 0 },
  { id: "starter", name: "Starter", priceMonthly: 999, priceYearly: 9990 },
  { id: "pro", name: "Pro", priceMonthly: 2499, priceYearly: 24990 },
  { id: "enterprise", name: "Enterprise", priceMonthly: 7999, priceYearly: 79990 },
];

export default function BillingSettingsPage() {
  const [dashData, setDashData] = useState<Awaited<ReturnType<typeof getBillingDashboardData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await getBillingDashboardData();
      if (!cancelled) {
        setDashData(result);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleUpgrade(planId: string, interval: "monthly" | "yearly") {
    setUpgrading(true);
    const result = await initiatePlanCheckoutAction({
      planId,
      billingInterval: interval,
      successUrl: `${window.location.origin}/app/settings/billing?success=true`,
      cancelUrl: `${window.location.origin}/app/settings/billing?canceled=true`,
    });
    if (result.success && result.data.checkoutUrl) {
      window.location.assign(result.data.checkoutUrl);
    }
    setUpgrading(false);
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? You will retain access until the end of the current billing period.")) {
      return;
    }
    await cancelSubscriptionAction({ atPeriodEnd: true });
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Billing & Subscription</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const data = dashData?.success ? dashData.data : null;
  const currentPlan = data?.subscription?.planId ?? "free";
  const status = data?.subscription?.status ?? "none";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>

      {/* Current Plan Card */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Current Plan</h2>
            <p className="text-2xl font-bold capitalize mt-1">{currentPlan}</p>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className={`font-medium ${status === "active" ? "text-green-600" : status === "past_due" ? "text-red-600" : "text-yellow-600"}`}>
                {status}
              </span>
            </p>
            {data?.subscription?.currentPeriodEnd && (
              <p className="text-sm text-gray-500">
                Next billing: {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {status === "active" && currentPlan !== "free" && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              Cancel Plan
            </button>
          )}
        </div>

        {data?.subscription?.cancelAtPeriodEnd && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            Your subscription will be canceled at the end of the current billing period.
          </div>
        )}

        {data?.dunningStatus && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            Payment failed. Retry attempt #{data.dunningStatus.attemptNumber} scheduled for day {data.dunningStatus.scheduledDay}.
            {data.dunningStatus.willCancel && " Subscription will be canceled if payment is not resolved."}
          </div>
        )}
      </div>

      {/* Plan Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 ${plan.id === currentPlan ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-2xl font-bold mt-2">
                {plan.priceMonthly === 0 ? "Free" : `₹${plan.priceMonthly}`}
                {plan.priceMonthly > 0 && <span className="text-sm font-normal text-gray-500">/mo</span>}
              </p>
              {plan.id !== "free" && plan.id !== currentPlan && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => handleUpgrade(plan.id, "monthly")}
                    disabled={upgrading}
                    className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => handleUpgrade(plan.id, "yearly")}
                    disabled={upgrading}
                    className="w-full px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Yearly (Save 17%)
                  </button>
                </div>
              )}
              {plan.id === currentPlan && (
                <div className="mt-4 text-center text-sm text-blue-600 font-medium">Current Plan</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      {data?.recentInvoices && data.recentInvoices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Period</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3">
                      {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3">₹{(Number(inv.amountPaise) / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${inv.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gateway Info */}
      {data?.billingAccount && (
        <div className="text-sm text-gray-500 border-t pt-4">
          <p>Gateway: {data.billingAccount.gateway} • Currency: {data.billingAccount.currency} • Billing email: {data.billingAccount.billingEmail}</p>
        </div>
      )}
    </div>
  );
}
