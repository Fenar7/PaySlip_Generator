"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDunningStep } from "../actions";

const TONES = ["FRIENDLY", "POLITE", "FIRM", "URGENT", "ESCALATE"] as const;

const TEMPLATE_VARS = [
  "{{customer_name}}",
  "{{invoice_number}}",
  "{{amount_due}}",
  "{{due_date}}",
  "{{company_name}}",
  "{{payment_link}}",
  "{{opt_out_link}}",
];

interface DunningStepFormProps {
  sequenceId: string;
  nextStepNumber: number;
}

export function DunningStepForm({
  sequenceId,
  nextStepNumber,
}: DunningStepFormProps) {
  const router = useRouter();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const channels: string[] = [];
    if (formData.get("channelEmail") === "on") channels.push("email");
    if (formData.get("channelSms") === "on") channels.push("sms");

    try {
      const result = await addDunningStep(sequenceId, {
        stepNumber: nextStepNumber,
        daysOffset: parseInt(formData.get("daysOffset") as string, 10) || 0,
        channels,
        tone: formData.get("tone") as string,
        emailSubject: formData.get("emailSubject") as string,
        emailBody: formData.get("emailBody") as string,
        smsBody: (formData.get("smsBody") as string) || undefined,
        smsTemplateId: (formData.get("smsTemplateId") as string) || undefined,
        createTicket: formData.get("createTicket") === "on",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Number & Days Offset */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[var(--foreground)]">
            Step Number
          </label>
          <div className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] px-3.5 py-2.5 text-sm text-[var(--foreground)]">
            {nextStepNumber}
          </div>
        </div>
        <Input
          id="daysOffset"
          name="daysOffset"
          label="Days After Due Date"
          type="number"
          min={0}
          defaultValue={0}
          required
        />
      </div>

      {/* Channels */}
      <fieldset>
        <legend className="mb-2 text-[0.75rem] font-semibold text-[var(--foreground)]">
          Channels
        </legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="channelEmail"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="channelSms"
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            SMS
          </label>
        </div>
      </fieldset>

      {/* Tone */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="tone"
          className="text-[0.75rem] font-semibold text-[var(--foreground)]"
        >
          Tone
        </label>
        <select
          id="tone"
          name="tone"
          defaultValue="POLITE"
          required
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
        >
          {TONES.map((tone) => (
            <option key={tone} value={tone}>
              {tone.charAt(0) + tone.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Email Subject */}
      <Input
        id="emailSubject"
        name="emailSubject"
        label="Email Subject"
        placeholder="Reminder: Invoice {{invoice_number}} is overdue"
        required
      />

      {/* Email Body */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="emailBody"
          className="text-[0.75rem] font-semibold text-[var(--foreground)]"
        >
          Email Body
        </label>
        <textarea
          id="emailBody"
          name="emailBody"
          rows={6}
          required
          placeholder="Dear {{customer_name}},&#10;&#10;This is a reminder that invoice {{invoice_number}} for {{amount_due}} was due on {{due_date}}.&#10;&#10;Please make the payment at your earliest convenience: {{payment_link}}&#10;&#10;Thank you,&#10;{{company_name}}"
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
        />
        <div className="flex flex-wrap gap-1.5 mt-1">
          {TEMPLATE_VARS.map((v) => (
            <span
              key={v}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-mono text-slate-500"
            >
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* SMS Body (conditional) */}
      {smsEnabled && (
        <>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="smsBody"
              className="text-[0.75rem] font-semibold text-[var(--foreground)]"
            >
              SMS Body
            </label>
            <textarea
              id="smsBody"
              name="smsBody"
              rows={3}
              placeholder="Hi {{customer_name}}, invoice {{invoice_number}} for {{amount_due}} is overdue. Pay here: {{payment_link}}"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            />
          </div>
          <Input
            id="smsTemplateId"
            name="smsTemplateId"
            label="SMS Template ID (optional)"
            placeholder="e.g. DLT-123456"
          />
        </>
      )}

      {/* Create Ticket */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="createTicket"
          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
        />
        Create support ticket on this step
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Step"}
        </Button>
      </div>
    </form>
  );
}
