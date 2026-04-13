import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkflowForm } from "@/components/flow/workflow-form";

export const metadata: Metadata = { title: "Create Workflow — Flow" };

export default function NewWorkflowPage() {
  return (
    <div className="flex flex-col flex-1 p-6 max-w-3xl mx-auto w-full gap-6">
      {/* Back nav */}
      <div>
        <Link
          href="/app/flow/workflows"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Workflows
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Workflow</h1>
        <p className="text-[var(--muted-foreground)] mt-1 text-sm">
          Define a trigger and a sequence of approved actions for your organisation.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-white dark:bg-zinc-950 shadow-sm p-6">
        <WorkflowForm mode="create" />
      </div>
    </div>
  );
}
