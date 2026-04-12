"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockBooksPeriod, reopenBooksPeriod } from "../actions";

interface PeriodActionButtonsProps {
  periodId: string;
  status: string;
}

export function PeriodActionButtons({ periodId, status }: PeriodActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLock() {
    if (!confirm("Lock this fiscal period? New journals will be blocked until it is reopened.")) {
      return;
    }

    startTransition(async () => {
      const result = await lockBooksPeriod(periodId);
      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleReopen() {
    const reason = prompt("Reason for reopening this period. This direct admin action is audit logged.");
    if (!reason?.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await reopenBooksPeriod(periodId, reason.trim());
      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  return status === "OPEN" ? (
    <button
      type="button"
      onClick={handleLock}
      disabled={isPending}
      className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
    >
      {isPending ? "Locking..." : "Lock"}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleReopen}
      disabled={isPending}
      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
    >
      {isPending ? "Reopening..." : "Reopen"}
    </button>
  );
}
