"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SequencePeriodicity } from "@/features/sequences/types";
import {
  buildFormatString,
  parseFormatString,
  validateBuilderConfig,
  renderPreview,
  buildNextPreview,
  RESET_CYCLE_LABELS,
} from "@/features/sequences/builder";
import type { SequenceBuilderConfig } from "@/features/sequences/builder";
import { validateFormat } from "@/features/sequences/engine/tokenizer";

interface SequenceBuilderProps {
  documentType: "INVOICE" | "VOUCHER";
  config: SequenceBuilderConfig;
  onChange: (config: SequenceBuilderConfig) => void;
  rawFormat: string;
  onRawFormatChange: (format: string) => void;
  advancedMode: boolean;
  onAdvancedModeChange: (advanced: boolean) => void;
}

export function SequenceBuilder({
  documentType,
  config,
  onChange,
  rawFormat,
  onRawFormatChange,
  advancedMode,
  onAdvancedModeChange,
}: SequenceBuilderProps) {
  const formatString = useMemo(() => buildFormatString(config), [config]);
  const validation = useMemo(() => validateBuilderConfig(config), [config]);
  // In advanced mode, preview and validation must follow the raw format being edited.
  const activeFormatString = advancedMode ? rawFormat : formatString;
  const preview = useMemo(() => renderPreview(activeFormatString, 1), [activeFormatString]);

  const documentLabel = documentType === "INVOICE" ? "Invoice" : "Voucher";

  return (
    <div className="space-y-4">
      {/* Advanced mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#1a1a1a]">
          {advancedMode ? "Advanced format editor" : "Number pattern builder"}
        </span>
        <button
          type="button"
          onClick={() => {
            if (!advancedMode) {
              // Switching to advanced: sync raw format from current config
              onRawFormatChange(buildFormatString(config));
            } else {
              // Switching from advanced: try to parse raw format back to builder
              const parsed = parseFormatString(rawFormat, documentType === "INVOICE" ? "INV" : "VCH");
              if (parsed) {
                onChange(parsed);
              }
            }
            onAdvancedModeChange(!advancedMode);
          }}
          className="text-xs text-[#666] hover:text-[#1a1a1a] underline"
        >
          {advancedMode ? "Switch to builder" : "Advanced format editor"}
        </button>
      </div>

      {advancedMode ? (
        <AdvancedEditor
          rawFormat={rawFormat}
          onRawFormatChange={onRawFormatChange}
        />
      ) : (
        <BuilderFields
          config={config}
          onChange={onChange}
          validation={validation}
        />
      )}

      {/* Live preview */}
      {preview && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 space-y-1">
          <p className="text-xs text-green-700 font-medium">Live preview</p>
          <p className="text-sm text-[#1a1a1a] font-mono">{preview}</p>
          <p className="text-xs text-[#666]">
            {documentLabel} numbers will follow this pattern.
          </p>
        </div>
      )}

      {advancedMode && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
          Advanced mode lets you edit the raw token format. This is intended for
          power users who need patterns the builder does not support.
        </div>
      )}
    </div>
  );
}

function BuilderFields({
  config,
  onChange,
  validation,
}: {
  config: SequenceBuilderConfig;
  onChange: (c: SequenceBuilderConfig) => void;
  validation: { valid: boolean; errors: string[] };
}) {
  const update = (patch: Partial<SequenceBuilderConfig>) => {
    onChange({ ...config, ...patch });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Prefix"
        value={config.prefix}
        onChange={(e) => update({ prefix: e.target.value.toUpperCase() })}
        placeholder="e.g. INV"
        maxLength={20}
      />

      <div>
        <label className="block text-[0.75rem] font-semibold text-[var(--foreground)] mb-1.5">
          Reset cycle
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(RESET_CYCLE_LABELS) as [SequencePeriodicity, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const patch: Partial<SequenceBuilderConfig> = { resetCycle: value };
                  if (value === "FINANCIAL_YEAR") {
                    patch.useFinancialYear = true;
                    patch.includeYear = false;
                    patch.includeMonth = false;
                  } else if (value === "MONTHLY") {
                    patch.includeYear = true;
                    patch.includeMonth = true;
                    patch.useFinancialYear = false;
                  } else if (value === "YEARLY") {
                    patch.includeYear = true;
                    patch.includeMonth = false;
                    patch.useFinancialYear = false;
                  } else {
                    // NONE — keep user choice but default to no date
                    patch.includeYear = false;
                    patch.includeMonth = false;
                    patch.useFinancialYear = false;
                  }
                  update(patch);
                }}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  config.resetCycle === value
                    ? "border-[var(--accent)] bg-red-50 text-[#1a1a1a]"
                    : "border-[var(--border-strong)] bg-white text-[#666] hover:border-[var(--accent)]"
                }`}
              >
                <span className="font-medium">{label}</span>
              </button>
            )
          )}
        </div>
      </div>

      <div>
        <label className="block text-[0.75rem] font-semibold text-[var(--foreground)] mb-1.5">
          Number length
        </label>
        <div className="flex gap-2">
          {[3, 4, 5, 6].map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => update({ numberLength: len as 3 | 4 | 5 | 6 })}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                config.numberLength === len
                  ? "border-[var(--accent)] bg-red-50 text-[#1a1a1a]"
                  : "border-[var(--border-strong)] bg-white text-[#666] hover:border-[var(--accent)]"
              }`}
            >
              {len} digits
            </button>
          ))}
        </div>
      </div>

      {/* Date style toggles — shown when reset cycle allows customization */}
      {config.resetCycle === "NONE" && (
        <div className="space-y-2">
          <label className="block text-[0.75rem] font-semibold text-[var(--foreground)]">
            Date in number
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-[#1a1a1a]">
              <input
                type="checkbox"
                checked={config.includeYear}
                onChange={(e) => update({ includeYear: e.target.checked })}
                className="rounded border-[var(--border-strong)]"
              />
              Include year
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1a1a1a]">
              <input
                type="checkbox"
                checked={config.includeMonth}
                onChange={(e) => update({ includeMonth: e.target.checked })}
                className="rounded border-[var(--border-strong)]"
              />
              Include month
            </label>
          </div>
        </div>
      )}

      {config.useFinancialYear && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          Financial year labels look like FY25-26 and reset every April–March.
        </div>
      )}

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
          {validation.errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function AdvancedEditor({
  rawFormat,
  onRawFormatChange,
}: {
  rawFormat: string;
  onRawFormatChange: (v: string) => void;
}) {
  const validation = useMemo(() => validateFormat(rawFormat), [rawFormat]);
  const preview = useMemo(() => renderPreview(rawFormat, 1), [rawFormat]);

  return (
    <div className="space-y-3">
      <Input
        label="Format string"
        value={rawFormat}
        onChange={(e) => onRawFormatChange(e.target.value)}
        placeholder="INV/{YYYY}/{NNNNN}"
      />
      <p className="text-xs text-[#999]">
        Valid tokens: {"{YYYY}"}, {"{MM}"}, {"{DD}"}, {"{NNNNN}"}, {"{FY}"}
      </p>
      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {validation.errors.join("; ")}
        </div>
      )}
      {preview && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
          Preview: <span className="font-mono font-medium">{preview}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export interface SequenceSummaryProps {
  documentType: "INVOICE" | "VOUCHER";
  config: SequenceBuilderConfig;
  nextPreview?: string | null;
  latestIssuedNumber?: number | null;
  isActive?: boolean;
}

export function SequenceSummary({
  documentType,
  config,
  nextPreview,
  latestIssuedNumber,
  isActive,
}: SequenceSummaryProps) {
  const formatString = useMemo(() => buildFormatString(config), [config]);
  const example = useMemo(() => renderPreview(formatString, 1), [formatString]);
  const resetText = RESET_CYCLE_LABELS[config.resetCycle];
  const noun = documentType === "INVOICE" ? "Invoices" : "Vouchers";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1a1a1a]">
          {documentType === "INVOICE" ? "Invoice Numbering" : "Voucher Numbering"}
        </h3>
        {isActive !== undefined && (
          <Badge variant={isActive ? "success" : "warning"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        )}
      </div>

      <div className="rounded-lg bg-[#f8f8f8] border border-[#e5e5e5] px-4 py-3 space-y-2">
        <p className="text-sm text-[#1a1a1a]">
          <span className="font-medium">{noun}</span> will look like{" "}
          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#e5e5e5]">
            {example ?? "—"}
          </span>{" "}
          and{" "}
          {config.resetCycle === "NONE"
            ? "continue without resetting"
            : `reset ${resetText.toLowerCase()}`}
          .
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[#999]">Number pattern</p>
            <p className="font-mono text-[#1a1a1a]">{formatString}</p>
          </div>
          <div>
            <p className="text-xs text-[#999]">Reset cycle</p>
            <p className="text-[#1a1a1a]">{resetText}</p>
          </div>
          <div>
            <p className="text-xs text-[#999]">Latest issued number</p>
            <p className="font-mono text-[#1a1a1a]">{latestIssuedNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[#999]">Next number</p>
            <p className="font-mono text-[#1a1a1a] font-medium">{nextPreview ?? "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export interface ContinuityBuilderProps {
  documentType: "INVOICE" | "VOUCHER";
  formatString: string;
  lastUsedNumber: string;
  onLastUsedNumberChange: (v: string) => void;
  onSeed: () => void;
  loading: boolean;
}

export function ContinuityBuilder({
  documentType,
  formatString,
  lastUsedNumber,
  onLastUsedNumberChange,
  onSeed,
  loading,
}: ContinuityBuilderProps) {
  const { preview, error } = useMemo(
    () => buildNextPreview(formatString, lastUsedNumber || undefined),
    [formatString, lastUsedNumber]
  );

  const docLabel = documentType === "INVOICE" ? "invoice" : "voucher";

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#666]">
        If you already issued {docLabel} numbers outside Slipwise, enter the last
        number you used. Slipwise will continue from the next number.
      </p>

      <Input
        label="Last number already used"
        value={lastUsedNumber}
        onChange={(e) => onLastUsedNumberChange(e.target.value)}
        placeholder={`e.g. ${documentType === "INVOICE" ? "INV/2026/00042" : "VCH/2026/00042"}`}
      />

      {lastUsedNumber.trim() && (
        <div className="space-y-2">
          {error ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 space-y-1">
              <p className="text-xs text-blue-700">
                You entered: <span className="font-mono font-medium">{lastUsedNumber}</span>
              </p>
              <p className="text-xs text-blue-700">
                Slipwise will next issue:{" "}
                <span className="font-mono font-medium">{preview}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={onSeed}
        disabled={loading || !lastUsedNumber.trim() || !!error}
        variant="primary"
      >
        {loading ? "Saving…" : `Continue from this ${docLabel} number`}
      </Button>
    </div>
  );
}
