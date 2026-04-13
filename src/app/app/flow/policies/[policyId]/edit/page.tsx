import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApprovalPolicyForm } from "@/components/flow/approval-policy-form";

export const metadata: Metadata = { title: "Edit Approval Policy — Flow" };

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { orgId } = await requireOrgContext();
  const { policyId } = await params;

  const policy = await db.approvalPolicy.findFirst({
    where: { id: policyId, orgId },
  });

  if (!policy) notFound();

  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/app/flow/policies/${policyId}`}
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {policy.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Policy — {policy.name}</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Changes affect new approval requests only. Existing in-flight approvals are not impacted.
        </p>
      </div>

      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-950 shadow-sm">
        <ApprovalPolicyForm
          mode="edit"
          initialData={{
            id: policy.id,
            name: policy.name,
            module: policy.module,
            eventType: policy.eventType,
            stepMode: policy.stepMode as "SINGLE" | "SEQUENTIAL",
            escalateAfterMins: policy.escalateAfterMins,
          }}
        />
      </div>
    </div>
  );
}
