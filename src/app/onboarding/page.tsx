import { redirect } from "next/navigation";
import { getAuthRoutingContext } from "@/lib/auth";
import { OnboardingPageClient } from "./onboarding-page-client";

export default async function OnboardingPage() {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect(context.loginPath ?? "/auth/login");
  }

  if (context.hasOrg) {
    redirect("/app/home");
  }

  return <OnboardingPageClient />;
}
