"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshBooksReconciliationSuggestions } from "../actions";

interface RefreshReconciliationButtonProps {
  bankAccountId?: string;
  importId?: string;
}

export function RefreshReconciliationButton({
  bankAccountId,
  importId,
}: RefreshReconciliationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshBooksReconciliationSuggestions({ bankAccountId, importId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Refreshed ${result.data.refreshed} transaction suggestion${result.data.refreshed === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={handleRefresh} disabled={isPending}>
      {isPending ? "Refreshing..." : "Refresh Suggestions"}
    </Button>
  );
}
