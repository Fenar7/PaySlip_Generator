import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { EscalationRuleForm } from "@/components/flow/escalation-rule-form";

export const metadata: Metadata = { title: "Edit Escalation Rule — Flow" };

export default async function EditEscalationRulePage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  const { orgId } = await requireOrgContext();

  const rule = await db.ticketEscalationRule.findFirst({
    where: { id: ruleId, orgId },
  });

  if (!rule) {
    notFound();
  }

  return (
    <div className="flex flex-col flex-1 p-6 max-w-3xl mx-auto w-full gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/app/flow/escalations"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Escalation Rules
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit Escalation Rule — {rule.name}
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm">
          Update the rule configuration. Changes take effect immediately.
        </p>
      </div>

      <div className="rounded-xl border bg-white dark:bg-zinc-950 p-6 shadow-sm">
        <EscalationRuleForm
          mode="edit"
          initialData={{
            id: rule.id,
            name: rule.name,
            breachType: rule.breachType,
            afterMins: rule.afterMins,
            targetRole: rule.targetRole,
            targetUserId: rule.targetUserId,
            notifyOrgAdmins: rule.notifyOrgAdmins,
            enabled: rule.enabled,
          }}
        />
      </div>
    </div>
  );
}
