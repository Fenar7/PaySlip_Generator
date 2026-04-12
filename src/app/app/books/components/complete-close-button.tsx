"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { completeBooksClose } from "../actions";

interface CompleteCloseButtonProps {
  fiscalPeriodId: string;
  disabled?: boolean;
}

export function CompleteCloseButton({ fiscalPeriodId, disabled = false }: CompleteCloseButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function complete() {
    const notes = prompt("Close notes (optional)", "");
    if (notes === null) {
      return;
    }

    startTransition(async () => {
      const result = await completeBooksClose({
        fiscalPeriodId,
        notes: notes || undefined,
      });
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={complete} disabled={disabled || isPending}>
      {isPending ? "Closing..." : "Close Period"}
    </Button>
  );
}
