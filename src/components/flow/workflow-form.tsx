"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_TRIGGERS, TRIGGER_LABELS } from "@/lib/flow/catalog";
import { WorkflowStepEditor, type StepDraft } from "./workflow-step-editor";
import {
  createWorkflow,
  updateWorkflow,
  updateWorkflowSteps,
} from "@/app/app/flow/workflows/actions";
import { Plus, Loader2, AlertCircle } from "lucide-react";

type StepDraftLocal = StepDraft;

export interface WorkflowFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    triggerType: string;
    status: string;
    steps: {
      id: string;
      sequence: number;
      actionType: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditionJson?: any;
      label?: string | null;
    }[];
  };
}

export function WorkflowForm({ mode, initialData }: WorkflowFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [triggerType, setTriggerType] = useState(
    initialData?.triggerType ?? SUPPORTED_TRIGGERS[0]
  );
  const [steps, setSteps] = useState<StepDraftLocal[]>(
    initialData?.steps.length
      ? initialData.steps.map((s) => ({
          actionType: s.actionType,
          config: (s.config as Record<string, unknown>) ?? {},
          conditionJson: s.conditionJson ?? null,
          label: s.label ?? undefined,
        }))
      : []
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});

  // ── Step helpers ──────────────────────────────────────────────────────────

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { actionType: "send_notification", config: {}, conditionJson: null },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, step: StepDraftLocal) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: { name?: string } = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          const result = await createWorkflow({
            name: name.trim(),
            triggerType,
            steps,
          });

          if (!result.success) {
            setFormError(result.error);
            return;
          }
          router.push(`/app/flow/workflows/${result.data.id}`);
        } else {
          // edit mode
          const wfId = initialData!.id;

          const updateResult = await updateWorkflow(wfId, {
            name: name.trim(),
            description: description.trim() || undefined,
            triggerType,
          });

          if (!updateResult.success) {
            setFormError(updateResult.error);
            return;
          }

          const stepsResult = await updateWorkflowSteps(wfId, steps);

          if (!stepsResult.success) {
            setFormError(stepsResult.error);
            return;
          }

          router.push(`/app/flow/workflows/${wfId}`);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Global error */}
      {formError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {formError}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="wf-name"
          className="text-sm font-medium"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="wf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Invoice Overdue Notification"
          className={`text-sm rounded-xl border px-4 py-2.5 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.name
              ? "border-red-400 dark:border-red-600"
              : "border-zinc-200 dark:border-zinc-700"
          }`}
        />
        {fieldErrors.name && (
          <p className="text-xs text-red-500">{fieldErrors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wf-description" className="text-sm font-medium">
          Description{" "}
          <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
        </label>
        <textarea
          id="wf-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe what this workflow does…"
          className="text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Trigger type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wf-trigger" className="text-sm font-medium">
          Trigger Type <span className="text-red-500">*</span>
        </label>
        <select
          id="wf-trigger"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
          className="text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SUPPORTED_TRIGGERS.map((trigger) => (
            <option key={trigger} value={trigger}>
              {TRIGGER_LABELS[trigger] ?? trigger}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--muted-foreground)]">
          The event that fires this workflow. Only approved trigger families allowed.
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Steps</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Actions executed in sequence when the trigger fires.
            </p>
          </div>
          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-8 text-center text-sm text-[var(--muted-foreground)]">
            No steps added yet. Click &quot;Add Step&quot; to configure the first action.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <WorkflowStepEditor
                key={index}
                index={index}
                step={step}
                onChange={(updated) => updateStep(index, updated)}
                onRemove={() => removeStep(index)}
                onMoveUp={index > 0 ? () => moveStep(index, "up") : undefined}
                onMoveDown={
                  index < steps.length - 1
                    ? () => moveStep(index, "down")
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "create" ? "Create Workflow" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
