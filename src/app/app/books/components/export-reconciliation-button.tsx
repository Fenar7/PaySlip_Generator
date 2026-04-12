"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportBooksReconciliationCsv } from "../actions";

interface ExportReconciliationButtonProps {
  filters: {
    bankAccountId?: string;
    importId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  };
}

function downloadCsv(csv: string, filenamePrefix: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportReconciliationButton({ filters }: ExportReconciliationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportBooksReconciliationCsv(filters);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      downloadCsv(result.data, "reconciliation");
      toast.success("CSV exported");
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={handleExport} disabled={isPending}>
      {isPending ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
