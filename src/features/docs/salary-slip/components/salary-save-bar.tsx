"use client";

import { useFormContext } from "react-hook-form";
import type { SalarySlipFormValues } from "../types";

interface SalarySlipSaveBarProps {
  onSaveDraft: () => void;
  onRelease: () => void;
  isSaving: boolean;
  savedId?: string;
  slipNumber?: string;
}

export function SalarySlipSaveBar({
  onSaveDraft,
  onRelease,
  isSaving,
  savedId,
  slipNumber,
}: SalarySlipSaveBarProps) {
  const {
    formState: { isDirty },
  } = useFormContext<SalarySlipFormValues>();

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
              Saved {slipNumber && `· ${slipNumber}`}
            </span>
          )}
          {isSaving && <span className="text-sm text-slate-400">Saving...</span>}
        </div>
        <div className="flex items-center gap-2">
          {savedId && (
            <a
              href={`/app/docs/salary-slips/${savedId}`}
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
            onClick={onRelease}
            disabled={isSaving}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Release Slip
          </button>
        </div>
      </div>
    </div>
  );
}
