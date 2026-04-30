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

  // If the user has an org, check whether required setup onboarding is
  // complete.  Only the setup steps (accountCreated, emailVerified,
  // orgSetup, documentNumbering) gate access to /app/home.  Later
  // adoption milestones like firstDocCreated do not block exit.
  if (context.hasOrg) {
    const status = await getOnboardingStatus(context.userId);
    if (status.isSetupComplete) {
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
