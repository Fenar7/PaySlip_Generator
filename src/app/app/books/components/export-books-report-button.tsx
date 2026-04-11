"use client";

import { useTransition } from "react";
import type { JournalEntryStatus, JournalSource } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  exportBooksJournalRegisterCsv,
  exportBooksLedgerCsv,
  exportBooksTrialBalanceCsv,
  exportChartOfAccountsCsv,
} from "../actions";

type ExportBooksReportButtonProps =
  | {
      report: "chart-of-accounts";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
    }
  | {
      report: "journals";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        status?: JournalEntryStatus;
        source?: JournalSource;
        startDate?: string;
        endDate?: string;
        accountId?: string;
      };
    }
  | {
      report: "ledger";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        startDate?: string;
        endDate?: string;
        accountId?: string;
      };
    }
  | {
      report: "trial-balance";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        startDate?: string;
        endDate?: string;
        includeInactive?: boolean;
      };
    };

function downloadCsv(csv: string, filenamePrefix: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportBooksReportButton(props: ExportBooksReportButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result =
        props.report === "chart-of-accounts"
          ? await exportChartOfAccountsCsv()
          : props.report === "journals"
            ? await exportBooksJournalRegisterCsv(props.filters)
            : props.report === "ledger"
              ? await exportBooksLedgerCsv(props.filters)
              : await exportBooksTrialBalanceCsv(props.filters);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      downloadCsv(result.data, props.filenamePrefix);
      toast.success("CSV exported");
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={handleExport} disabled={isPending || props.disabled}>
      {isPending ? "Exporting..." : (props.label ?? "Export CSV")}
    </Button>
  );
}
