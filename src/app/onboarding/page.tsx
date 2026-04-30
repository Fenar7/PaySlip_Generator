import { redirect } from "next/navigation";
import { getAuthRoutingContext } from "@/lib/auth";
import { getOnboardingStatus } from "@/lib/onboarding-tracker";
import { getOnboardingSequenceState } from "./actions";
import { OnboardingPageClient } from "./onboarding-page-client";

export default async function OnboardingPage() {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect(context.loginPath ?? "/auth/login");
  }

  // If the user has an org, check whether they still have incomplete
  // required onboarding steps (e.g. Document Numbering).  Only redirect
  // to the app when onboarding is fully complete.
  if (context.hasOrg) {
    const status = await getOnboardingStatus(context.userId);
    if (status.isComplete) {
      redirect("/app/home");
    }

    // Onboarding incomplete — hydrate the existing sequence state so
    // the client can resume from the Document Numbering step instead
    // of starting from scratch.
    const sequenceState = await getOnboardingSequenceState(context.orgId);
    return (
      <OnboardingPageClient
        orgId={context.orgId}
        orgName={context.orgName}
        sequenceState={sequenceState}
      />
    );
  }

  return <OnboardingPageClient />;
}
