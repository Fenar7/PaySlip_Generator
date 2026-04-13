import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SlaPolicyForm } from "@/components/flow/sla-policy-form";

export const metadata: Metadata = { title: "Edit SLA Policy — Flow" };

export default async function EditSlaPolicyPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { orgId } = await requireOrgContext();
  const { policyId } = await params;

  const policy = await db.ticketSlaPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) notFound();

  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/app/flow/sla/${policyId}`}
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {policy.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit SLA Policy — {policy.name}</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Changes apply to newly created tickets. Existing ticket deadlines are not recalculated.
        </p>
      </div>

      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-950 shadow-sm">
        <SlaPolicyForm
          mode="edit"
          initialData={{
            id: policy.id,
            name: policy.name,
            category: policy.category,
            priority: policy.priority,
            firstResponseTargetMins: policy.firstResponseTargetMins,
            resolutionTargetMins: policy.resolutionTargetMins,
            businessHoursOnly: policy.businessHoursOnly,
            isDefault: policy.isDefault,
          }}
        />
      </div>
    </div>
  );
}
