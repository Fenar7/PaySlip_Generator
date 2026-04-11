import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/multi-org";
import { redirect } from "next/navigation";
import { CancelBillingPageClient } from "./page-client";

export default async function CancelBillingPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const activeOrg = await getActiveOrg(user.id);
  if (!activeOrg) redirect("/onboarding");

  const sub = await db.subscription.findUnique({
    where: { orgId: activeOrg.id },
    select: { planId: true, razorpaySubId: true },
  });
  if (!sub || sub.planId === "free" || !sub.razorpaySubId) {
    redirect("/app/billing");
  }

  return (
    <CancelBillingPageClient orgId={activeOrg.id} />
  );
}
