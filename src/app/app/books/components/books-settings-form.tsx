"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateBooksSettingsDefaultMappings } from "../actions";

interface BooksSettingsFormProps {
  mappings: Array<{
    field:
      | "defaultReceivableAccountId"
      | "defaultPayableAccountId"
      | "defaultBankAccountId"
      | "defaultRevenueAccountId"
      | "defaultExpenseAccountId"
      | "defaultPayrollExpenseAccountId"
      | "defaultPayrollPayableAccountId"
      | "defaultGstOutputAccountId"
      | "defaultTdsPayableAccountId"
      | "defaultGatewayClearingAccountId"
      | "defaultSuspenseAccountId";
    label: string;
    description: string;
    expectedAccountTypes: string[];
    expectedNormalBalance: string;
    account: {
      id: string;
      code: string;
      name: string;
    } | null;
  }>;
  accountOptions: Array<{
    id: string;
    code: string;
    name: string;
    accountType: string;
    normalBalance: string;
  }>;
}

export function BooksSettingsForm({
  mappings,
  accountOptions,
}: BooksSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      mappings.map((mapping) => [mapping.field, mapping.account?.id ?? ""]),
    ),
  );

  const optionsByField = useMemo(
    () =>
      mappings.reduce<Record<string, typeof accountOptions>>((acc, mapping) => {
        acc[mapping.field] = accountOptions.filter(
          (account) =>
            mapping.expectedAccountTypes.includes(account.accountType) &&
            account.normalBalance === mapping.expectedNormalBalance,
        );
        return acc;
      }, {}),
    [accountOptions, mappings],
  );

  function updateValue(field: string, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccessMessage(null);
  }

  function submit() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateBooksSettingsDefaultMappings({
        defaultReceivableAccountId: values.defaultReceivableAccountId ?? "",
        defaultPayableAccountId: values.defaultPayableAccountId ?? "",
        defaultBankAccountId: values.defaultBankAccountId ?? "",
        defaultRevenueAccountId: values.defaultRevenueAccountId ?? "",
        defaultExpenseAccountId: values.defaultExpenseAccountId ?? "",
        defaultPayrollExpenseAccountId: values.defaultPayrollExpenseAccountId ?? "",
        defaultPayrollPayableAccountId: values.defaultPayrollPayableAccountId ?? "",
        defaultGstOutputAccountId: values.defaultGstOutputAccountId ?? "",
        defaultTdsPayableAccountId: values.defaultTdsPayableAccountId ?? "",
        defaultGatewayClearingAccountId: values.defaultGatewayClearingAccountId ?? "",
        defaultSuspenseAccountId: values.defaultSuspenseAccountId ?? "",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        "Default mappings updated. Changes apply only to future postings.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Default posting mappings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update the control and default accounts used for future Books
            postings. Existing journals are never rewritten.
          </p>
        </div>
        <Button type="button" onClick={submit} disabled={isPending}>
          {isPending ? "Saving..." : "Save mappings"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Changes apply only to future postings. Historical journals and prior
        close periods remain unchanged.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {mappings.map((mapping) => (
          <label
            key={mapping.field}
            className="block rounded-xl border border-slate-200 p-4 text-sm"
          >
            <span className="block font-medium text-slate-900">
              {mapping.label}
            </span>
            <span className="mt-1 block text-slate-500">
              {mapping.description}
            </span>
            <span className="mt-1 block text-xs uppercase tracking-wide text-slate-400">
              {mapping.expectedAccountTypes.join(" / ")} •{" "}
              {mapping.expectedNormalBalance}
            </span>
            <select
              value={values[mapping.field] ?? ""}
              onChange={(event) =>
                updateValue(mapping.field, event.target.value)
              }
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select account</option>
              {optionsByField[mapping.field].map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name} ({account.normalBalance})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
