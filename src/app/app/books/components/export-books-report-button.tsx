"use client";

import { useTransition } from "react";
import type { JournalEntryStatus, JournalSource } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  exportBooksAccountsPayableAgingCsv,
  exportBooksAccountsReceivableAgingCsv,
  exportBooksBalanceSheetCsv,
  exportBooksCashFlowCsv,
  exportBooksJournalRegisterCsv,
  exportBooksLedgerCsv,
  exportBooksPaymentRunPayoutCsv,
  exportBooksProfitLossCsv,
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
    }
  | {
      report: "profit-loss";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        startDate?: string;
        endDate?: string;
        compareStartDate?: string;
        compareEndDate?: string;
      };
    }
  | {
      report: "balance-sheet";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        asOfDate?: string;
        compareAsOfDate?: string;
      };
    }
  | {
      report: "cash-flow";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        startDate?: string;
        endDate?: string;
      };
    }
  | {
      report: "ar-aging" | "ap-aging";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      filters: {
        asOfDate?: string;
      };
    }
  | {
      report: "payment-run-payout";
      filenamePrefix: string;
      disabled?: boolean;
      label?: string;
      paymentRunId: string;
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
      let result;
      switch (props.report) {
        case "chart-of-accounts":
          result = await exportChartOfAccountsCsv();
          break;
        case "journals":
          result = await exportBooksJournalRegisterCsv(props.filters);
          break;
        case "ledger":
          result = await exportBooksLedgerCsv(props.filters);
          break;
        case "trial-balance":
          result = await exportBooksTrialBalanceCsv(props.filters);
          break;
        case "profit-loss":
          result = await exportBooksProfitLossCsv(props.filters);
          break;
        case "balance-sheet":
          result = await exportBooksBalanceSheetCsv(props.filters);
          break;
        case "cash-flow":
          result = await exportBooksCashFlowCsv(props.filters);
          break;
        case "ar-aging":
          result = await exportBooksAccountsReceivableAgingCsv(props.filters);
          break;
        case "ap-aging":
          result = await exportBooksAccountsPayableAgingCsv(props.filters);
          break;
        case "payment-run-payout":
          result = await exportBooksPaymentRunPayoutCsv(props.paymentRunId);
          break;
      }

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
