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

  const [sub, profile] = await Promise.all([
    db.subscription.findUnique({
      where: { orgId: activeOrg.id },
      select: {
        planId: true,
        razorpaySubId: true,
        status: true,
      },
    }),
    db.profile.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    }),
  ]);

  const currentPlanId = (sub?.planId ?? "free") as PlanId;
  const hasManagedSubscription = Boolean(
    sub?.razorpaySubId &&
      sub.status !== "cancelled" &&
      sub.status !== "expired",
  );

  const userName =
    profile?.name ??
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ??
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null);
  const userEmail = profile?.email ?? user.email ?? null;

  return (
    <UpgradePageClient
      orgId={activeOrg.id}
      currentPlanId={currentPlanId}
      hasManagedSubscription={hasManagedSubscription}
      subscriptionStatus={sub?.status ?? null}
      userEmail={userEmail}
      userName={userName}
    />
  );
}
