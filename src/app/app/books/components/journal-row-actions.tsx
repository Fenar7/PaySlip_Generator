"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { postBooksJournal, reverseBooksJournal } from "../actions";

interface JournalRowActionsProps {
  journalEntryId: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
}

export function JournalRowActions({ journalEntryId, status }: JournalRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status === "REVERSED") {
    return <span className="text-xs text-slate-400">Closed</span>;
  }

  function handlePost() {
    startTransition(async () => {
      const result = await postBooksJournal(journalEntryId);
      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleReverse() {
    const memo = prompt("Optional reversal memo", "");
    if (memo === null) {
      return;
    }

    startTransition(async () => {
      const result = await reverseBooksJournal(journalEntryId, memo);
      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  return status === "DRAFT" ? (
    <button
      type="button"
      onClick={handlePost}
      disabled={isPending}
      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
    >
      {isPending ? "Posting..." : "Post"}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleReverse}
      disabled={isPending}
      className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
    >
      {isPending ? "Reversing..." : "Reverse"}
    </button>
  );
}
