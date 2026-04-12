"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markBooksCloseTaskReviewed } from "../actions";

interface CloseTaskReviewButtonsProps {
  fiscalPeriodId: string;
  code: "ar_aging_reviewed" | "ap_aging_reviewed" | "gst_tie_out_reviewed" | "tds_tie_out_reviewed";
}

export function CloseTaskReviewButtons({ fiscalPeriodId, code }: CloseTaskReviewButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(status: "PASSED" | "WAIVED") {
    const note = prompt(
      status === "PASSED" ? "Optional review note" : "Why are you waiving this close task?",
      "",
    );

    if (note === null) {
      return;
    }

    startTransition(async () => {
      const result = await markBooksCloseTaskReviewed({
        fiscalPeriodId,
        code,
        status,
        note: note || undefined,
      });

      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => update("PASSED")} disabled={isPending}>
        {isPending ? "Updating..." : "Mark Passed"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => update("WAIVED")} disabled={isPending}>
        Waive
      </Button>
    </div>
  );
}
