import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApprovalPolicyForm } from "@/components/flow/approval-policy-form";

export const metadata: Metadata = { title: "Create Approval Policy — Flow" };

export default function NewPolicyPage() {
  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/flow/policies"
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Policies
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Approval Policy</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Define a new policy to route approvals based on module, event, and amount rules.
        </p>
      </div>

      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-950 shadow-sm">
        <ApprovalPolicyForm mode="create" />
      </div>
    </div>
  );
}
