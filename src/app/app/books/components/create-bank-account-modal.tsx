"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BankAccountType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { createBooksBankAccount } from "../actions";

const ACCOUNT_TYPES: Array<{ value: BankAccountType; label: string }> = [
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "PETTY_CASH", label: "Petty Cash" },
  { value: "GATEWAY_CLEARING", label: "Gateway Clearing" },
];

export function CreateBankAccountModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<BankAccountType>("BANK");
  const [bankName, setBankName] = useState("");
  const [maskedAccountNo, setMaskedAccountNo] = useState("");
  const [ifscOrSwift, setIfscOrSwift] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingBalanceDate, setOpeningBalanceDate] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setType("BANK");
    setBankName("");
    setMaskedAccountNo("");
    setIfscOrSwift("");
    setCurrency("INR");
    setOpeningBalance("0");
    setOpeningBalanceDate("");
    setIsPrimary(false);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const parsedOpeningBalance = Number.parseFloat(openingBalance || "0");
      const result = await createBooksBankAccount({
        name,
        type,
        bankName,
        maskedAccountNo,
        ifscOrSwift,
        currency,
        openingBalance: Number.isFinite(parsedOpeningBalance) ? parsedOpeningBalance : 0,
        openingBalanceDate: openingBalanceDate || undefined,
        isPrimary,
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
      <Button onClick={() => setOpen(true)}>New Bank Account</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add bank account</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a cash, bank, or gateway-clearing account for reconciliation.
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
                  <span className="mb-1 block font-medium text-slate-700">Account name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. HDFC Current Account"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Type</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as BankAccountType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {ACCOUNT_TYPES.map((accountType) => (
                      <option key={accountType.value} value={accountType.value}>
                        {accountType.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Bank name</span>
                  <input
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Masked account #</span>
                  <input
                    value={maskedAccountNo}
                    onChange={(event) => setMaskedAccountNo(event.target.value)}
                    placeholder="e.g. XXXX1234"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">IFSC / SWIFT</span>
                  <input
                    value={ifscOrSwift}
                    onChange={(event) => setIfscOrSwift(event.target.value)}
                    placeholder="e.g. HDFC0001234"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Currency</span>
                  <input
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                    placeholder="INR"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                    maxLength={3}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Opening balance</span>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(event) => setOpeningBalance(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Opening balance date</span>
                  <input
                    type="date"
                    value={openingBalanceDate}
                    onChange={(event) => setOpeningBalanceDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(event) => setIsPrimary(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Mark as primary settlement bank
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button variant="secondary" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending ? "Creating..." : "Create Bank Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
