"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  confirmBooksReconciliationMatch,
  createBooksBankAdjustmentJournal,
  ignoreBooksBankTransaction,
  rejectBooksReconciliationMatch,
} from "../actions";

interface BankTransactionActionsProps {
  transactionId: string;
  status: string;
  suggestions: Array<{
    id: string;
    entityType: string;
    entityId: string;
    matchedAmount: number;
    confidenceScore: number | null;
    status: string;
  }>;
  manualAccounts: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

export function BankTransactionActions({
  transactionId,
  status,
  suggestions,
  manualAccounts,
}: BankTransactionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [offsetAccountId, setOffsetAccountId] = useState(manualAccounts[0]?.id ?? "");

  const confirmedSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "CONFIRMED"),
    [suggestions],
  );
  const openSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "SUGGESTED"),
    [suggestions],
  );

  function refreshAfterSuccess(message: string) {
    toast.success(message);
    router.refresh();
  }

  function confirmSuggestion(matchId: string, defaultAmount: number) {
    const rawAmount = prompt(
      "Confirm matched amount. Reduce the amount to keep the remaining balance in review.",
      defaultAmount.toFixed(2),
    );
    if (rawAmount === null) {
      return;
    }

    const matchedAmount = Number.parseFloat(rawAmount);
    if (!Number.isFinite(matchedAmount) || matchedAmount <= 0) {
      toast.error("Enter a valid matched amount.");
      return;
    }

    const reason = window.prompt("Optional reconciliation note for the audit trail", "") ?? "";

    startTransition(async () => {
      const result = await confirmBooksReconciliationMatch({
        bankTransactionId: transactionId,
        matchId,
        matchedAmount,
        reason: reason.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      refreshAfterSuccess("Match confirmed");
    });
  }

  function rejectSuggestion(matchId: string) {
    startTransition(async () => {
      const result = await rejectBooksReconciliationMatch({
        bankTransactionId: transactionId,
        matchId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      refreshAfterSuccess("Suggestion rejected");
    });
  }

  function ignoreTransaction() {
    if (!confirm("Ignore this bank transaction? It will stay out of active matching queues.")) {
      return;
    }

    startTransition(async () => {
      const result = await ignoreBooksBankTransaction(transactionId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      refreshAfterSuccess("Bank transaction ignored");
    });
  }

  function createAdjustment() {
    if (!offsetAccountId) {
      toast.error("Choose an offset account first.");
      return;
    }

    const memo = prompt("Adjustment memo", "Bank adjustment");
    if (memo === null) {
      return;
    }

    startTransition(async () => {
      const result = await createBooksBankAdjustmentJournal({
        bankTransactionId: transactionId,
        offsetAccountId,
        memo,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      refreshAfterSuccess(`Journal ${result.data.entryNumber} created`);
    });
  }

  return (
    <div className="space-y-3">
      {confirmedSuggestions.length > 0 && (
        <div className="space-y-1">
          {confirmedSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800"
            >
              Confirmed {suggestion.entityType.replaceAll("_", " ")} for{" "}
              {suggestion.matchedAmount.toFixed(2)}
            </div>
          ))}
        </div>
      )}

      {openSuggestions.length > 0 ? (
        <div className="space-y-2">
          {openSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {suggestion.entityType.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    Suggested {suggestion.matchedAmount.toFixed(2)}
                    {suggestion.confidenceScore !== null
                      ? ` • confidence ${Math.round(suggestion.confidenceScore)}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => confirmSuggestion(suggestion.id, suggestion.matchedAmount)}
                    disabled={isPending}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => rejectSuggestion(suggestion.id)}
                    disabled={isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {status === "IGNORED" ? "Ignored transaction" : "No open suggestions"}
        </div>
      )}

      {status !== "IGNORED" && (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-200 px-3 py-3">
          {status === "PARTIALLY_MATCHED" && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Partially matched lines remain in review until the remaining balance is either matched or cleared with an adjusting journal.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={offsetAccountId}
              onChange={(event) => setOffsetAccountId(event.target.value)}
              className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {manualAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" variant="secondary" onClick={createAdjustment} disabled={isPending}>
              Adjust via Journal
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={ignoreTransaction} disabled={isPending}>
              Ignore
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Use an adjusting journal for suspense, reclassification, or one-off bank write-offs.
          </p>
        </div>
      )}
    </div>
  );
}
