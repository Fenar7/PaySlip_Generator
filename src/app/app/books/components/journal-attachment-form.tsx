"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadBooksJournalAttachment } from "../actions";

interface JournalAttachmentFormProps {
  journalEntryId: string;
}

export function JournalAttachmentForm({
  journalEntryId,
}: JournalAttachmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("journalEntryId", journalEntryId);
      formData.set("file", file);

      const result = await uploadBooksJournalAttachment(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setFile(null);
      const input = document.getElementById(
        `journal-attachment-${journalEntryId}`,
      ) as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Journal evidence
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Upload support documents, reconciliations, and approval evidence for
          this journal.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          id={`journal-attachment-${journalEntryId}`}
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <Button type="button" onClick={submit} disabled={isPending || !file}>
          {isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}
