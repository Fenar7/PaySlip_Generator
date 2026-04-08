import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { PortalProfileForm } from "./profile-form";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await getPortalSession();
  if (!session) redirect(`/portal/${orgSlug}/auth/login`);

  const customer = await db.customer.findFirst({
    where: {
      id: session.customerId,
      organizationId: session.orgId,
    },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
    },
  });

  if (!customer) redirect(`/portal/${orgSlug}/auth/login`);

  await db.customerPortalAccessLog.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      path: `/portal/${orgSlug}/profile`,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and update your contact information
        </p>
      </div>

      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <PortalProfileForm customer={customer} />
      </div>
    </div>
  );
}
