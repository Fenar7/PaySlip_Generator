import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EscalationRuleForm } from "@/components/flow/escalation-rule-form";

export const metadata: Metadata = { title: "New Escalation Rule — Flow" };

export default function NewEscalationRulePage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Create Escalation Rule</h1>
        <p className="text-[var(--muted-foreground)] text-sm">
          Define when and how to escalate a breach event to the appropriate team member or role.
        </p>
      </div>

      <div className="rounded-xl border bg-white dark:bg-zinc-950 p-6 shadow-sm">
        <EscalationRuleForm mode="create" />
      </div>
    </div>
  );
}
