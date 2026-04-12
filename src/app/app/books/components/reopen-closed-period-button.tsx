"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reopenBooksClosedPeriod } from "../actions";

interface ReopenClosedPeriodButtonProps {
  periodId: string;
}

export function ReopenClosedPeriodButton({ periodId }: ReopenClosedPeriodButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function reopen() {
    const reason = prompt(
      "Reason for reopening this fiscal period. This direct admin action is audit logged.",
    );
    if (!reason?.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await reopenBooksClosedPeriod(periodId, reason.trim());
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="danger" onClick={reopen} disabled={isPending}>
      {isPending ? "Reopening..." : "Reopen Period"}
    </Button>
  );
}
