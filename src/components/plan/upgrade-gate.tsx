"use client";

import React from "react";
import { Lock } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import type { PlanId, PlanLimits } from "@/lib/plans/config";

interface UpgradeGateProps {
  feature: string;
  orgId: string;
  children: React.ReactNode;
  minimumPlan?: PlanId;
}

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "enterprise"];

export function UpgradeGate({
  feature,
  orgId,
  children,
  minimumPlan,
}: UpgradeGateProps) {
  const { plan, loading } = usePlan(orgId);

  if (loading) return <>{children}</>;

  if (plan) {
    // Check boolean feature flag
    const featureValue = plan.limits[feature as keyof PlanLimits];
    if (typeof featureValue === "boolean" && featureValue) {
      return <>{children}</>;
    }

    // Check minimum plan level
    if (minimumPlan) {
      const currentIndex = PLAN_ORDER.indexOf(plan.planId);
      const requiredIndex = PLAN_ORDER.indexOf(minimumPlan);
      if (currentIndex >= requiredIndex) {
        return <>{children}</>;
      }
    }

    // If no minimumPlan specified and feature is truthy, allow
    if (!minimumPlan && featureValue) {
      return <>{children}</>;
    }
  }

  const requiredPlan = minimumPlan ?? "starter";

  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Lock className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} to unlock{" "}
          {feature.replace(/([A-Z])/g, " $1").toLowerCase()}
        </h3>
        <p className="text-sm text-gray-500">
          This feature is not available on your current plan.
        </p>
        <a
          href="/app/billing/upgrade"
          className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Upgrade Now
        </a>
      </div>
    </div>
  );
}
