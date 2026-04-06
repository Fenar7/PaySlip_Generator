"use client";

import { useEffect, useState } from "react";
import type { PlanId, PlanLimits } from "@/lib/plans/config";

interface PlanInfo {
  planId: PlanId;
  planName: string;
  status: string;
  limits: PlanLimits;
  trialEndsAt: string | null;
  isTrialing: boolean;
  isFree: boolean;
}

export function usePlan(orgId: string | undefined) {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    async function fetchPlan() {
      try {
        const res = await fetch(`/api/billing/plan?orgId=${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setPlan(data);
        }
      } catch (err) {
        console.error("Failed to fetch plan:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [orgId]);

  return { plan, loading };
}
