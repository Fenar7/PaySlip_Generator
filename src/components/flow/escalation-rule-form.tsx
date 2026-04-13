"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEscalationRule,
  updateEscalationRule,
} from "@/app/app/flow/escalations/actions";
import { SUPPORTED_BREACH_TYPES } from "@/app/app/flow/escalations/catalog";

export type EscalationRule = {
  id: string;
  name: string;
  breachType: string;
  afterMins: number;
  targetRole: string | null;
  targetUserId: string | null;
  notifyOrgAdmins: boolean;
  enabled: boolean;
};

const BREACH_TYPE_LABELS: Record<string, string> = {
  approval_breach: "Approval Breach",
  first_response_breach: "First Response Breach",
  resolution_breach: "Resolution Breach",
  delivery_failure: "Delivery Failure",
  dead_letter_summary: "Dead Letter Summary",
};

type Props = {
  mode: "create" | "edit";
  initialData?: EscalationRule;
};

export function EscalationRuleForm({ mode, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [breachType, setBreachType] = useState(initialData?.breachType ?? SUPPORTED_BREACH_TYPES[0]);
  const [afterMins, setAfterMins] = useState<number>(initialData?.afterMins ?? 30);
  const [targetRole, setTargetRole] = useState(initialData?.targetRole ?? "");
  const [targetUserId, setTargetUserId] = useState(initialData?.targetUserId ?? "");
  const [notifyOrgAdmins, setNotifyOrgAdmins] = useState(initialData?.notifyOrgAdmins ?? false);

  const hasTarget = !!targetRole.trim() || !!targetUserId.trim() || notifyOrgAdmins;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasTarget) {
      setError("At least one target is required: Target Role, Target User ID, or Notify Org Admins.");
      return;
    }

    const input = {
      name,
      breachType,
      afterMins,
      targetRole: targetRole.trim() || undefined,
      targetUserId: targetUserId.trim() || undefined,
      notifyOrgAdmins,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createEscalationRule(input);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push("/app/flow/escalations");
      } else if (mode === "edit" && initialData) {
        const result = await updateEscalationRule(initialData.id, input);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push("/app/flow/escalations");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Rule Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Escalate overdue approvals"
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Breach Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="breachType" className="text-sm font-medium">
          Breach Type <span className="text-red-500">*</span>
        </label>
        <select
          id="breachType"
          value={breachType}
          onChange={(e) => setBreachType(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {SUPPORTED_BREACH_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {BREACH_TYPE_LABELS[bt] ?? bt}
            </option>
          ))}
        </select>
      </div>

      {/* After Minutes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="afterMins" className="text-sm font-medium">
          Escalate After (minutes) <span className="text-red-500">*</span>
        </label>
        <input
          id="afterMins"
          type="number"
          required
          min={1}
          value={afterMins}
          onChange={(e) => setAfterMins(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-[var(--muted-foreground)]">Trigger escalation this many minutes after the breach event.</p>
      </div>

      {/* Target section */}
      <div className="rounded-lg border p-4 flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-900/50">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          Escalation Target <span className="text-red-500">*</span>
          <span className="font-normal ml-1">(at least one required)</span>
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="targetRole" className="text-sm font-medium">
            Target Role
          </label>
          <input
            id="targetRole"
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. finance_manager"
            className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="targetUserId" className="text-sm font-medium">
            Target User ID
          </label>
          <input
            id="targetUserId"
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="User UUID"
            className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyOrgAdmins}
            onChange={(e) => setNotifyOrgAdmins(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 accent-blue-600"
          />
          <span className="text-sm font-medium">Notify Org Admins</span>
        </label>

        {!hasTarget && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Provide at least one target to save this rule.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || !hasTarget}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isPending
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Rule"
            : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
