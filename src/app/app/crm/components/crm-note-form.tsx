"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CrmNoteFormProps {
  onSubmit: (content: string) => Promise<{ success: boolean; error?: string }>;
  placeholder?: string;
}

export function CrmNoteForm({
  onSubmit,
  placeholder = "Add a note…",
}: CrmNoteFormProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;

    setSubmitting(true);
    setError(null);
    const result = await onSubmit(content);
    setSubmitting(false);

    if (result.success) {
      setText("");
    } else {
      setError(result.error ?? "Failed to save note.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="slipwise-panel p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Add Note</h3>
      {error && (
        <p className="mb-2 text-xs text-[var(--state-danger)]">{error}</p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
      />
      <div className="mt-3 flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || submitting}
        >
          {submitting ? "Saving…" : "Save Note"}
        </Button>
      </div>
    </form>
  );
}
