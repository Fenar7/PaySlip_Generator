"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createManualJournal } from "../actions";

interface ManualJournalFormProps {
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    accountType: string;
    allowManualEntries: boolean;
    isActive: boolean;
  }>;
}

interface FormLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

function newLine(defaults?: Partial<FormLine>): FormLine {
  return {
    accountId: defaults?.accountId ?? "",
    description: defaults?.description ?? "",
    debit: defaults?.debit ?? 0,
    credit: defaults?.credit ?? 0,
  };
}

export function ManualJournalForm({ accounts }: ManualJournalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<FormLine[]>([
    newLine(),
    newLine(),
  ]);
  const [error, setError] = useState<string | null>(null);

  const availableAccounts = accounts.filter((account) => account.isActive && account.allowManualEntries);
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  function updateLine(index: number, patch: Partial<FormLine>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, newLine()]);
  }

  function removeLine(index: number) {
    setLines((current) => (current.length > 2 ? current.filter((_, lineIndex) => lineIndex !== index) : current));
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await createManualJournal({
        entryDate,
        memo,
        lines,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/app/books/journals");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-[220px,1fr]">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Entry date</span>
          <input
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Memo</span>
          <input
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="Optional journal memo"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Debit</th>
              <th className="px-4 py-3">Credit</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map((line, index) => (
              <tr key={`${index}-${line.accountId}`}>
                <td className="px-4 py-3">
                  <select
                    value={line.accountId}
                    onChange={(event) => updateLine(index, { accountId: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select account</option>
                    {availableAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    value={line.description}
                    onChange={(event) => updateLine(index, { description: event.target.value })}
                    placeholder="Line note"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit}
                    onChange={(event) =>
                      updateLine(index, {
                        debit: parseFloat(event.target.value) || 0,
                        credit: 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit}
                    onChange={(event) =>
                      updateLine(index, {
                        credit: parseFloat(event.target.value) || 0,
                        debit: 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addLine}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          + Add line
        </button>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex gap-6">
            <span className="text-slate-600">
              Debit: <strong className="text-slate-900">{totalDebit.toFixed(2)}</strong>
            </span>
            <span className="text-slate-600">
              Credit: <strong className="text-slate-900">{totalCredit.toFixed(2)}</strong>
            </span>
          </div>
          <div className={`mt-1 ${totalDebit === totalCredit ? "text-green-700" : "text-red-600"}`}>
            {totalDebit === totalCredit ? "Balanced entry" : "Debits and credits must match"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => router.push("/app/books/journals")} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Posting..." : "Post Journal"}
        </Button>
      </div>
    </div>
  );
}
