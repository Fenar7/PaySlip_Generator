"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDunningSequence } from "../../actions";

export function CreateSequenceForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const isDefault = formData.get("isDefault") === "on";

    try {
      const result = await createDunningSequence({ name, isDefault });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/app/pay/dunning/sequences/${result.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        id="name"
        name="name"
        label="Sequence Name"
        placeholder="e.g. Standard Reminder Flow"
        required
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isDefault"
          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
        />
        Set as default sequence for new overdue invoices
      </label>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Link href="/app/pay/dunning">
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create Sequence"}
        </Button>
      </div>
    </form>
  );
}
