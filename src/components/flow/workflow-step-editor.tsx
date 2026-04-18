"use client";

import { useState } from "react";
import { SUPPORTED_ACTIONS, ACTION_LABELS } from "@/lib/flow/catalog";
import { validateActionType } from "@/lib/flow/workflow-validation";
import { ChevronUp, ChevronDown, Trash2, ChevronRight } from "lucide-react";

export interface StepDraft {
  actionType: string;
  config: Record<string, unknown>;
  conditionJson?: Record<string, unknown> | null;
  label?: string;
}

export interface WorkflowStepEditorProps {
  index: number;
  step: StepDraft;
  onChange: (step: StepDraft) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function WorkflowStepEditor({
  index,
  step,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: WorkflowStepEditorProps) {
  const { valid: actionValid } = validateActionType(step.actionType);
  const [showCondition, setShowCondition] = useState(!!step.conditionJson);

  let configText = "{}";
  try {
    configText = JSON.stringify(step.config, null, 2);
  } catch {
    configText = "{}";
  }

  let conditionText = "";
  try {
    conditionText = step.conditionJson ? JSON.stringify(step.conditionJson, null, 2) : "";
  } catch {
    conditionText = "";
  }

  const handleConfigChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      onChange({ ...step, config: parsed });
    } catch {
      // ignore invalid JSON while typing
    }
  };

  const handleConditionChange = (value: string) => {
    if (!value.trim()) {
      onChange({ ...step, conditionJson: null });
      return;
    }
    try {
      const parsed = JSON.parse(value);
      onChange({ ...step, conditionJson: parsed });
    } catch {
      // ignore invalid JSON while typing
    }
  };

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col gap-3 ${
        !actionValid ? "border-red-400 dark:border-red-600" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Step {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            title="Move step up"
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            title="Move step down"
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove step"
            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Label */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Step Label <span className="font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={step.label ?? ""}
          onChange={(e) => onChange({ ...step, label: e.target.value || undefined })}
          placeholder="e.g. Notify customer"
          className="text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Action type select */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Action Type
        </label>
        <select
          value={step.actionType}
          onChange={(e) => onChange({ ...step, actionType: e.target.value })}
          className={`text-sm rounded-lg border px-3 py-2 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            !actionValid
              ? "border-red-400 dark:border-red-600"
              : "border-zinc-200 dark:border-zinc-700"
          }`}
        >
          {SUPPORTED_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action] ?? action}
            </option>
          ))}
        </select>
        {!actionValid && (
          <p className="text-xs text-red-500">Invalid action type</p>
        )}
      </div>

      {/* Config JSON textarea */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Config (JSON)
        </label>
        <textarea
          rows={4}
          defaultValue={configText}
          onChange={(e) => handleConfigChange(e.target.value)}
          spellCheck={false}
          placeholder="{}"
          className="text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          JSON configuration for this action. Keys depend on the action type.
        </p>
      </div>

      {/* Condition toggle */}
      <button
        type="button"
        onClick={() => setShowCondition((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline self-start"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform ${showCondition ? "rotate-90" : ""}`}
        />
        {showCondition ? "Hide condition" : "Add run condition (optional)"}
      </button>

      {showCondition && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Condition (JSON)
          </label>
          <textarea
            rows={3}
            defaultValue={conditionText}
            onChange={(e) => handleConditionChange(e.target.value)}
            spellCheck={false}
            placeholder='{"field": "amount", "operator": "gt", "value": 1000}'
            className="text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            Step only runs if this condition is met. Operators: eq, neq, gt, gte, lt, lte.
          </p>
        </div>
      )}
    </div>
  );
}
