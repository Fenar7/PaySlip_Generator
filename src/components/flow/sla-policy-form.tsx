"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createSlaPolicy, updateSlaPolicy } from "@/app/app/flow/sla/actions";

type TicketSlaPolicy = {
  id: string;
  name: string;
  category: string | null;
  priority: string | null;
  firstResponseTargetMins: number;
  resolutionTargetMins: number;
  businessHoursOnly: boolean;
  isDefault: boolean;
};

type Props = {
  mode: "create" | "edit";
  initialData?: TicketSlaPolicy;
};

const PRIORITY_OPTIONS = [
  { value: "", label: "Any (no filter)" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function SlaPolicyForm({ mode, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [priority, setPriority] = useState(initialData?.priority ?? "");
  const [firstResponseMins, setFirstResponseMins] = useState<string>(
    initialData?.firstResponseTargetMins != null ? String(initialData.firstResponseTargetMins) : ""
  );
  const [resolutionMins, setResolutionMins] = useState<string>(
    initialData?.resolutionTargetMins != null ? String(initialData.resolutionTargetMins) : ""
  );
  const [businessHoursOnly, setBusinessHoursOnly] = useState(
    initialData?.businessHoursOnly ?? false
  );
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const firstResponse = parseInt(firstResponseMins, 10);
    const resolution = parseInt(resolutionMins, 10);

    if (!firstResponseMins || isNaN(firstResponse) || firstResponse <= 0) {
      setError("First response target must be a positive number");
      return;
    }
    if (!resolutionMins || isNaN(resolution) || resolution <= 0) {
      setError("Resolution target must be a positive number");
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createSlaPolicy({
          name,
          category: category || undefined,
          priority: priority || undefined,
          firstResponseTargetMins: firstResponse,
          resolutionTargetMins: resolution,
          businessHoursOnly,
          isDefault,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/app/flow/sla/${result.data.id}`);
      } else {
        if (!initialData?.id) return;
        const result = await updateSlaPolicy(initialData.id, {
          name,
          category: category || null,
          priority: priority || null,
          firstResponseTargetMins: firstResponse,
          resolutionTargetMins: resolution,
          businessHoursOnly,
          isDefault,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/app/flow/sla/${initialData.id}`);
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
        <label className="text-sm font-medium" htmlFor="sla-name">
          Policy Name <span className="text-red-500">*</span>
        </label>
        <input
          id="sla-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard Support SLA"
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 placeholder:text-zinc-400"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="sla-category">
          Category
          <span className="ml-1 text-xs text-[var(--muted-foreground)] font-normal">optional</span>
        </label>
        <input
          id="sla-category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. billing, technical"
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 placeholder:text-zinc-400"
        />
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="sla-priority">
          Priority
          <span className="ml-1 text-xs text-[var(--muted-foreground)] font-normal">optional — filters when this policy applies</span>
        </label>
        <select
          id="sla-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Targets */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="sla-first-response">
            First Response Target (min) <span className="text-red-500">*</span>
          </label>
          <input
            id="sla-first-response"
            type="number"
            min={1}
            required
            value={firstResponseMins}
            onChange={(e) => setFirstResponseMins(e.target.value)}
            placeholder="e.g. 60"
            className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
          />
          {firstResponseMins && parseInt(firstResponseMins) > 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              = {Math.floor(parseInt(firstResponseMins) / 60)}h {parseInt(firstResponseMins) % 60}m
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="sla-resolution">
            Resolution Target (min) <span className="text-red-500">*</span>
          </label>
          <input
            id="sla-resolution"
            type="number"
            min={1}
            required
            value={resolutionMins}
            onChange={(e) => setResolutionMins(e.target.value)}
            placeholder="e.g. 1440"
            className="px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
          />
          {resolutionMins && parseInt(resolutionMins) > 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              = {Math.floor(parseInt(resolutionMins) / 60)}h {parseInt(resolutionMins) % 60}m
            </p>
          )}
        </div>
      </div>

      {/* Business Hours */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={businessHoursOnly}
          onChange={(e) => setBusinessHoursOnly(e.target.checked)}
          className="mt-0.5 rounded"
        />
        <div>
          <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">
            Business Hours Only
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            SLA timers only run during configured business hours, excluding weekends and holidays.
          </p>
        </div>
      </label>

      {/* Set as Default */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="mt-0.5 rounded"
        />
        <div className="flex-1">
          <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">
            Set as Default Policy
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Applied to tickets when no other policy matches by category or priority.
          </p>
          {isDefault && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This will replace any existing default SLA policy for your organization.
            </div>
          )}
        </div>
      </label>

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
            ? "Create SLA Policy"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
