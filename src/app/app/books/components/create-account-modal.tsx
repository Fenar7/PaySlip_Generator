"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createChartAccount } from "../actions";

interface CreateAccountModalProps {
  parentOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

function defaultNormalBalance(accountType: string) {
  switch (accountType) {
    case "LIABILITY":
    case "EQUITY":
    case "INCOME":
      return "CREDIT";
    default:
      return "DEBIT";
  }
}

export function CreateAccountModal({ parentOptions }: CreateAccountModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("EXPENSE");
  const [normalBalance, setNormalBalance] = useState("DEBIT");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setCode("");
    setName("");
    setAccountType("EXPENSE");
    setNormalBalance("DEBIT");
    setParentId("");
    setDescription("");
    setError(null);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await createChartAccount({
        code,
        name,
        accountType: accountType as
          | "ASSET"
          | "LIABILITY"
          | "EQUITY"
          | "INCOME"
          | "EXPENSE"
          | "CONTRA",
        normalBalance: normalBalance as "DEBIT" | "CREDIT",
        parentId: parentId || undefined,
        description,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      close();
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New Account</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create account</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a custom account under your SW Books chart of accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-xl text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Code</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="e.g. 6100"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Office Supplies"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Account type</span>
                  <select
                    value={accountType}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      setAccountType(nextType);
                      setNormalBalance(defaultNormalBalance(nextType));
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="EQUITY">Equity</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="CONTRA">Contra</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Normal balance</span>
                  <select
                    value={normalBalance}
                    onChange={(event) => setNormalBalance(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </label>

                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-slate-700">Parent account</span>
                  <select
                    value={parentId}
                    onChange={(event) => setParentId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">No parent</option>
                    {parentOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-slate-700">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button variant="secondary" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
