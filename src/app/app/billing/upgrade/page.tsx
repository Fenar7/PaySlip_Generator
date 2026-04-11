import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/multi-org";
import type { PlanId } from "@/lib/plans/config";
import { redirect } from "next/navigation";
import { UpgradePageClient } from "./page-client";

export default async function UpgradePage() {
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
      razorpaySubId: true,
      status: true,
    },
  });

  const currentPlanId = (sub?.planId ?? "free") as PlanId;
  const hasManagedSubscription = Boolean(
    sub?.razorpaySubId &&
      sub.status !== "cancelled" &&
      sub.status !== "expired",
  );

  return (
    <UpgradePageClient
      orgId={activeOrg.id}
      currentPlanId={currentPlanId}
      hasManagedSubscription={hasManagedSubscription}
      subscriptionStatus={sub?.status ?? null}
    />
  );
}
