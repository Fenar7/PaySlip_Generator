"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadBooksBankStatement } from "../actions";

interface UploadBankStatementFormProps {
  bankAccounts: Array<{
    id: string;
    name: string;
    bankName?: string | null;
    mappingProfile?: unknown;
  }>;
}

type MappingState = {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  creditColumn: string;
  debitColumn: string;
  referenceColumn: string;
  balanceColumn: string;
  valueDateColumn: string;
  payeeColumn: string;
  dateFormat: "DMY" | "MDY" | "YMD";
};

const DEFAULT_MAPPING: MappingState = {
  dateColumn: "Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  creditColumn: "",
  debitColumn: "",
  referenceColumn: "Reference",
  balanceColumn: "Balance",
  valueDateColumn: "",
  payeeColumn: "",
  dateFormat: "DMY",
};

function normalizeMappingProfile(value: unknown): Partial<MappingState> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const mapping = value as Record<string, unknown>;
  return {
    dateColumn: typeof mapping.dateColumn === "string" ? mapping.dateColumn : undefined,
    descriptionColumn:
      typeof mapping.descriptionColumn === "string" ? mapping.descriptionColumn : undefined,
    amountColumn: typeof mapping.amountColumn === "string" ? mapping.amountColumn : undefined,
    creditColumn: typeof mapping.creditColumn === "string" ? mapping.creditColumn : undefined,
    debitColumn: typeof mapping.debitColumn === "string" ? mapping.debitColumn : undefined,
    referenceColumn:
      typeof mapping.referenceColumn === "string" ? mapping.referenceColumn : undefined,
    balanceColumn: typeof mapping.balanceColumn === "string" ? mapping.balanceColumn : undefined,
    valueDateColumn:
      typeof mapping.valueDateColumn === "string" ? mapping.valueDateColumn : undefined,
    payeeColumn: typeof mapping.payeeColumn === "string" ? mapping.payeeColumn : undefined,
    dateFormat:
      mapping.dateFormat === "DMY" || mapping.dateFormat === "MDY" || mapping.dateFormat === "YMD"
        ? mapping.dateFormat
        : undefined,
  };
}

export function UploadBankStatementForm({ bankAccounts }: UploadBankStatementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const selectedAccount = useMemo(
    () => bankAccounts.find((account) => account.id === bankAccountId),
    [bankAccountId, bankAccounts],
  );

  const [mapping, setMapping] = useState<MappingState>(() => ({
    ...DEFAULT_MAPPING,
    ...normalizeMappingProfile(bankAccounts[0]?.mappingProfile),
  }));

  function updateMappingField<K extends keyof MappingState>(key: K, value: MappingState[K]) {
    setMapping((current) => ({ ...current, [key]: value }));
  }

  function handleBankChange(nextBankAccountId: string) {
    setBankAccountId(nextBankAccountId);
    const account = bankAccounts.find((item) => item.id === nextBankAccountId);
    setMapping({
      ...DEFAULT_MAPPING,
      ...normalizeMappingProfile(account?.mappingProfile),
    });
  }

  function submit() {
    if (!bankAccountId) {
      toast.error("Select a bank account first.");
      return;
    }

    if (!file) {
      toast.error("Choose a CSV statement file.");
      return;
    }

    const formData = new FormData();
    formData.set("bankAccountId", bankAccountId);
    formData.set("mapping", JSON.stringify(mapping));
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadBooksBankStatement(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Imported ${result.data.importedRows} row${result.data.importedRows === 1 ? "" : "s"}.`,
      );
      router.push(`/app/books/reconciliation/imports/${result.data.importId}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Import bank statement</h2>
        <p className="text-sm text-slate-500">
          Upload a CSV statement, save the mapping on the bank account, and generate reconciliation
          suggestions automatically.
        </p>
      </div>

      {bankAccounts.length === 0 ? (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Create a bank account first to import statements.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Bank account</span>
              <select
                value={bankAccountId}
                onChange={(event) => handleBankChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.bankName ? ` — ${account.bankName}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm xl:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">CSV / Excel file</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Date column</span>
              <input
                value={mapping.dateColumn}
                onChange={(event) => updateMappingField("dateColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Description column</span>
              <input
                value={mapping.descriptionColumn}
                onChange={(event) => updateMappingField("descriptionColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Date format</span>
              <select
                value={mapping.dateFormat}
                onChange={(event) =>
                  updateMappingField("dateFormat", event.target.value as MappingState["dateFormat"])
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="DMY">DD/MM/YYYY</option>
                <option value="MDY">MM/DD/YYYY</option>
                <option value="YMD">YYYY/MM/DD</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Amount column</span>
              <input
                value={mapping.amountColumn}
                onChange={(event) => updateMappingField("amountColumn", event.target.value)}
                placeholder="Leave blank if using debit/credit columns"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Credit column</span>
              <input
                value={mapping.creditColumn}
                onChange={(event) => updateMappingField("creditColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Debit column</span>
              <input
                value={mapping.debitColumn}
                onChange={(event) => updateMappingField("debitColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Reference column</span>
              <input
                value={mapping.referenceColumn}
                onChange={(event) => updateMappingField("referenceColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Balance column</span>
              <input
                value={mapping.balanceColumn}
                onChange={(event) => updateMappingField("balanceColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Value date column</span>
              <input
                value={mapping.valueDateColumn}
                onChange={(event) => updateMappingField("valueDateColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Payee column</span>
              <input
                value={mapping.payeeColumn}
                onChange={(event) => updateMappingField("payeeColumn", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {selectedAccount?.bankName && (
            <p className="mt-3 text-xs text-slate-500">
              Saved mapping for <span className="font-medium text-slate-700">{selectedAccount.name}</span>
              {" "}will be updated after this import.
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? "Importing..." : "Import Statement"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
