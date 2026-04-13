import type { Metadata } from "next";
import { requireOrgContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkflowForm } from "@/components/flow/workflow-form";
import { getWorkflowWithRuns } from "../../actions";

export const metadata: Metadata = { title: "Edit Workflow — Flow" };

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  await requireOrgContext();
  const { workflowId } = await params;

  const workflow = await getWorkflowWithRuns(workflowId);

  if (!workflow) notFound();

  // Cannot edit an ACTIVE workflow — redirect to detail page
  if (workflow.status === "ACTIVE") {
    redirect(`/app/flow/workflows/${workflowId}`);
  }

  // Cannot edit ARCHIVED workflows either
  if (workflow.status === "ARCHIVED") {
    redirect(`/app/flow/workflows/${workflowId}`);
  }

  const initialData = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    triggerType: workflow.triggerType,
    status: workflow.status,
    steps: workflow.steps.map((s) => ({
      id: s.id,
      sequence: s.sequence,
      actionType: s.actionType,
      config: s.config,
    })),
  };

  return (
    <div className="flex flex-col flex-1 p-6 max-w-3xl mx-auto w-full gap-6">
      {/* Back nav */}
      <div>
        <Link
          href={`/app/flow/workflows/${workflowId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {workflow.name}
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit Workflow — <span className="text-blue-600 dark:text-blue-400">{workflow.name}</span>
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1 text-sm">
          This workflow is in{" "}
          <span className="font-medium">{workflow.status}</span> status and can be
          edited freely. Activate it when ready.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-white dark:bg-zinc-950 shadow-sm p-6">
        <WorkflowForm mode="edit" initialData={initialData} />
      </div>
    </div>
  );
}
