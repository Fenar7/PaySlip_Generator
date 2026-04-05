"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
}

export function RecurringRuleForm({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      baseInvoiceId: formData.get("baseInvoiceId") as string,
      frequency: formData.get("frequency") as string,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || undefined,
      autoSend: formData.get("autoSend") === "on",
    };

    try {
      const { createRecurringRule } = await import("../actions");
      const result = await createRecurringRule(payload);
      if (result.success) {
        router.push("/app/pay/recurring");
      } else {
        setError(result.error);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Base Invoice */}
      <div className="space-y-1.5">
        <label
          htmlFor="baseInvoiceId"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Base Invoice
        </label>
        <select
          id="baseInvoiceId"
          name="baseInvoiceId"
          required
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">Select an invoice…</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber} — ₹{inv.totalAmount.toLocaleString("en-IN")}
            </option>
          ))}
        </select>
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <label
          htmlFor="frequency"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Frequency
        </label>
        <select
          id="frequency"
          name="frequency"
          required
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY" selected>Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="YEARLY">Yearly</option>
        </select>
      </div>

      {/* Start Date */}
      <div className="space-y-1.5">
        <label
          htmlFor="startDate"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          First Run Date
        </label>
        <input
          type="date"
          id="startDate"
          name="startDate"
          required
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      {/* End Date */}
      <div className="space-y-1.5">
        <label
          htmlFor="endDate"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          End Date <span className="text-[var(--muted-foreground)]">(optional)</span>
        </label>
        <input
          type="date"
          id="endDate"
          name="endDate"
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      {/* Auto-Send */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoSend"
          name="autoSend"
          className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--ring)]"
        />
        <label htmlFor="autoSend" className="text-sm text-[var(--foreground)]">
          Automatically send generated invoices to the customer
        </label>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Creating…" : "Create Rule"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/app/pay/recurring")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
