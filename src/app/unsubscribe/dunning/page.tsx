import { db } from "@/lib/db";
import { verifyOptOutToken } from "@/lib/dunning-opt-out";

interface PageProps {
  searchParams: Promise<{
    token?: string;
    org?: string;
    cid?: string;
  }>;
}

export default async function DunningUnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { token, org: orgId, cid: customerId } = params;

  // Validate required params
  if (!token || !orgId || !customerId) {
    return <InvalidLinkView />;
  }

  // Verify HMAC token
  const isValid = verifyOptOutToken(token, orgId, customerId);
  if (!isValid) {
    return <InvalidLinkView />;
  }

  // Fetch org name for the confirmation message
  let orgName = "this organization";
  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    if (org) orgName = org.name;
  } catch {
    // Continue with generic name
  }

  // Upsert opt-out record
  let alreadyOptedOut = false;
  try {
    await db.dunningOptOut.upsert({
      where: { orgId_customerId: { orgId, customerId } },
      create: { orgId, customerId, token },
      update: { optedOutAt: new Date() },
    });
  } catch (error) {
    // Check if the customer/org exist
    const exists = await db.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
      select: { id: true },
    }).catch(() => null);

    if (!exists) {
      return <InvalidLinkView />;
    }

    // If upsert failed for another reason, it may be a duplicate
    console.error("[unsubscribe/dunning] Opt-out upsert error:", error);
    alreadyOptedOut = true;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          {alreadyOptedOut ? "Already Unsubscribed" : "Unsubscribed Successfully"}
        </h1>
        <p className="text-sm text-gray-600">
          {alreadyOptedOut
            ? `You were already unsubscribed from payment reminders from ${orgName}.`
            : `You've been unsubscribed from payment reminders from ${orgName}.`}
        </p>
        <p className="mt-4 text-xs text-gray-400">
          You will no longer receive dunning emails for outstanding invoices from this organization.
          If this was a mistake, please contact {orgName} directly.
        </p>
      </div>
    </div>
  );
}

function InvalidLinkView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Invalid or Expired Link</h1>
        <p className="text-sm text-gray-600">
          This unsubscribe link is invalid or has expired. Please contact the sender if you
          wish to opt out of payment reminders.
        </p>
      </div>
    </div>
  );
}
