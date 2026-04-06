"use client";

import React from "react";
import type { PlanId } from "@/lib/plans/config";
import { PLANS, formatPriceInr } from "@/lib/plans/config";

interface UpgradePromptProps {
  resource: string;
  current: number;
  limit: number;
  planId: PlanId;
  onClose: () => void;
  open: boolean;
}

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "enterprise"];

export function UpgradePrompt({
  resource,
  current,
  limit,
  planId,
  onClose,
  open,
}: UpgradePromptProps) {
  if (!open) return null;

  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 100;
  const currentPlanIndex = PLAN_ORDER.indexOf(planId);
  const upgradePlans = PLANS.filter(
    (p) => PLAN_ORDER.indexOf(p.id) > currentPlanIndex
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <h2 className="text-lg font-semibold text-gray-900">
          You&apos;ve reached your {resource} limit
        </h2>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;ve used{" "}
            <span className="font-medium text-gray-900">{current}</span> of{" "}
            <span className="font-medium text-gray-900">{limit}</span>{" "}
            {resource} this month
          </p>
        </div>

        {/* Upgrade comparison */}
        {upgradePlans.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Upgrade to get more
            </p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 font-medium text-gray-500">Plan</th>
                  <th className="pb-2 font-medium text-gray-500">Price</th>
                  <th className="pb-2 text-right font-medium text-gray-500">
                    Limit
                  </th>
                </tr>
              </thead>
              <tbody>
                {upgradePlans.map((plan) => {
                  const planLimit = (
                    plan.limits as unknown as Record<string, number | boolean>
                  )[resource];
                  return (
                    <tr key={plan.id} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-900">
                        {plan.name}
                      </td>
                      <td className="py-2 text-gray-600">
                        {formatPriceInr(plan.monthlyPriceInr)}/mo
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {planLimit === -1
                          ? "∞"
                          : typeof planLimit === "number"
                            ? planLimit.toLocaleString()
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <a
            href="/app/billing/upgrade"
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Upgrade
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
