"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveChartAccount } from "../actions";

interface AccountRowActionsProps {
  accountId: string;
  canArchive: boolean;
}

export function AccountRowActions({ accountId, canArchive }: AccountRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canArchive) {
    return <span className="text-xs text-slate-400">Protected</span>;
  }

  function handleArchive() {
    if (!confirm("Archive this account? This cannot be undone from the Books UI.")) {
      return;
    }

    startTransition(async () => {
      const result = await archiveChartAccount(accountId);
      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      {isPending ? "Archiving..." : "Archive"}
    </button>
  );
}
