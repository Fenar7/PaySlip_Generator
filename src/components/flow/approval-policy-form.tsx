"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createApprovalPolicy, updateApprovalPolicy } from "@/app/app/flow/policies/actions";

type ApprovalPolicy = {
  id: string;
  name: string;
  module: string;
  eventType: string;
  stepMode: "SINGLE" | "SEQUENTIAL";
  escalateAfterMins: number | null;
};

type Props = {
  mode: "create" | "edit";
  initialData?: ApprovalPolicy;
};

const MODULE_OPTIONS = [
  { value: "invoices", label: "Invoices" },
  { value: "vouchers", label: "Vouchers" },
  { value: "vendor_bills", label: "Vendor Bills" },
  { value: "payment_runs", label: "Payment Runs" },
  { value: "close", label: "Close Tasks" },
];

export function ApprovalPolicyForm({ mode, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [module, setModule] = useState(initialData?.module ?? "invoices");
  const [eventType, setEventType] = useState(initialData?.eventType ?? "");
  const [stepMode, setStepMode] = useState<"SINGLE" | "SEQUENTIAL">(
    initialData?.stepMode ?? "SINGLE"
  );
  const [escalateAfterMins, setEscalateAfterMins] = useState<string>(
    initialData?.escalateAfterMins != null ? String(initialData.escalateAfterMins) : ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const escalateParsed = escalateAfterMins ? parseInt(escalateAfterMins, 10) : undefined;

    startTransition(async () => {
      if (mode === "create") {
        const result = await createApprovalPolicy({
          name,
          module,
          eventType,
          stepMode,
          escalateAfterMins: escalateParsed,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/app/flow/policies/${result.data.id}`);
      } else {
        if (!initialData?.id) return;
        const result = await updateApprovalPolicy(initialData.id, {
          name,
          module,
          eventType,
          stepMode,
          escalateAfterMins: escalateParsed ?? null,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/app/flow/policies/${initialData.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="policy-name">
          Policy Name <span className="text-red-500">*</span>
        </label>
        <input
          id="policy-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Invoice Approval — High Value"
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 placeholder:text-zinc-400"
        />
      </div>

      {/* Module */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="policy-module">
          Module <span className="text-red-500">*</span>
        </label>
        <select
          id="policy-module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        >
          {MODULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Event Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="policy-event-type">
          Event Type <span className="text-red-500">*</span>
        </label>
        <input
          id="policy-event-type"
          type="text"
          required
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="e.g. invoice.submitted"
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 placeholder:text-zinc-400 font-mono"
        />
      </div>

      {/* Step Mode */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Step Mode <span className="text-red-500">*</span></p>
        <div className="flex flex-col gap-2">
          {(["SINGLE", "SEQUENTIAL"] as const).map((mode) => (
            <label
              key={mode}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                stepMode === mode
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="stepMode"
                value={mode}
                checked={stepMode === mode}
                onChange={() => setStepMode(mode)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{mode}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {mode === "SINGLE"
                    ? "Any single approver from the matching rule can approve."
                    : "Approvers are processed in sequence — each step must complete before the next."}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Escalate After */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="policy-escalate">
          Escalate After (minutes)
          <span className="ml-1 text-xs text-[var(--muted-foreground)] font-normal">optional</span>
        </label>
        <input
          id="policy-escalate"
          type="number"
          min={1}
          value={escalateAfterMins}
          onChange={(e) => setEscalateAfterMins(e.target.value)}
          placeholder="e.g. 1440"
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 placeholder:text-zinc-400 w-48"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          If set, pending approvals will escalate after this many minutes of inactivity.
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
            ? "Create Policy"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
