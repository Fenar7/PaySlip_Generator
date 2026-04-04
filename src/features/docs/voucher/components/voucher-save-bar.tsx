"use client";

import { useFormContext } from "react-hook-form";
import type { VoucherFormValues } from "../types";

interface VoucherSaveBarProps {
  onSaveDraft: () => void;
  onApprove: () => void;
  isSaving: boolean;
  savedId?: string;
  voucherNumber?: string;
  voucherType?: "payment" | "receipt";
}

export function VoucherSaveBar({
  onSaveDraft,
  onApprove,
  isSaving,
  savedId,
  voucherNumber,
  voucherType,
}: VoucherSaveBarProps) {
  const { formState: { isDirty } } = useFormContext<VoucherFormValues>();

  const approveClass =
    voucherType === "receipt"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-rose-600 hover:bg-rose-700";

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          {isDirty && !isSaving && (
            <span className="flex items-center gap-1.5 text-sm text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          {!isDirty && savedId && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Saved {voucherNumber && `· ${voucherNumber}`}
            </span>
          )}
          {isSaving && <span className="text-sm text-slate-400">Saving…</span>}
        </div>
        <div className="flex items-center gap-2">
          {savedId && (
            <a
              href={`/app/docs/vouchers/${savedId}`}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              View in Vault
            </a>
          )}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={isSaving}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${approveClass}`}
          >
            {voucherType === "receipt" ? "Approve Receipt" : "Approve Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
