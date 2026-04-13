"use client";

import { SUPPORTED_ACTIONS } from "@/lib/flow/workflow-engine";
import { validateActionType } from "@/lib/flow/workflow-validation";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

export interface WorkflowStepEditorProps {
  index: number;
  step: { actionType: string; config: Record<string, unknown> };
  onChange: (step: { actionType: string; config: Record<string, unknown> }) => void;
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

  let configText = "{}";
  try {
    configText = JSON.stringify(step.config, null, 2);
  } catch {
    configText = "{}";
  }

  const handleConfigChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      onChange({ ...step, config: parsed });
    } catch {
      // Keep raw text in a temp way — won't commit invalid JSON
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
              {action}
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
          Provide JSON configuration for this action. Keys depend on the selected action type.
        </p>
      </div>
    </div>
  );
}
