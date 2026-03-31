"use client";

import type { PageSettings } from "@/features/pdf-studio/types";
import {
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  FIT_MODE_OPTIONS,
  MARGIN_OPTIONS,
} from "@/features/pdf-studio/constants";
import { cn } from "@/lib/utils";
import { ChangeEvent } from "react";

type PageSettingsPanelProps = {
  settings: PageSettings;
  onChange: (settings: PageSettings) => void;
};

type OptionGroupProps<T extends string> = {
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
};

function OptionGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[0.9rem] border px-3 py-2.5 text-left text-[0.8rem] font-medium transition-colors",
              value === option.value
                ? "border-[var(--accent)] bg-white text-[var(--foreground)] shadow-[0_8px_20px_rgba(232,64,30,0.10)]"
                : "border-[var(--border-soft)] bg-[rgba(248,241,235,0.6)] text-[var(--foreground-soft)] hover:border-[var(--border-strong)] hover:bg-white",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilenameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[0.82rem] font-medium text-[var(--foreground)]">Output filename</p>
      <div className="flex items-center gap-2 rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 shadow-[0_10px_24px_rgba(34,34,34,0.035)] transition-colors focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="pdf-studio-document"
          className="min-w-0 flex-1 py-3 text-[0.88rem] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <span className="shrink-0 text-[0.78rem] text-[var(--muted-foreground)]">.pdf</span>
      </div>
    </div>
  );
}

function TextInput({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 shadow-[0_10px_24px_rgba(34,34,34,0.035)] transition-colors focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 py-3 text-[0.88rem] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-[1rem] border px-4 py-3.5 text-left shadow-[0_10px_24px_rgba(34,34,34,0.035)] transition-[border-color,background-color,box-shadow]",
        checked
          ? "border-[var(--accent)] bg-white"
          : "border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)]",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-5 text-[var(--foreground)]">{label}</span>
        {hint ? (
          <span className="mt-1 block text-[0.75rem] leading-5 text-[var(--foreground-soft)]/80">{hint}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "relative inline-block h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-200",
          checked ? "bg-[var(--accent)]" : "bg-[rgba(87,87,96,0.18)]",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(34,34,34,0.16)] transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

function RangeInput({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
          {hint ? (
            <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
          ) : null}
        </div>
        <span className="text-[0.78rem] font-medium text-[var(--foreground-soft)]">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );
}

export function PageSettingsPanel({ settings, onChange }: PageSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <OptionGroup
        label="Page size"
        options={PAGE_SIZE_OPTIONS}
        value={settings.size}
        onChange={(size) => onChange({ ...settings, size })}
      />

      <OptionGroup
        label="Orientation"
        hint="Auto matches the image aspect ratio."
        options={ORIENTATION_OPTIONS}
        value={settings.orientation}
        onChange={(orientation) => onChange({ ...settings, orientation })}
      />

      <OptionGroup
        label="Fit mode"
        hint="How images fill the page area."
        options={FIT_MODE_OPTIONS}
        value={settings.fitMode}
        onChange={(fitMode) => onChange({ ...settings, fitMode })}
      />

      <OptionGroup
        label="Margins"
        options={MARGIN_OPTIONS}
        value={settings.margins}
        onChange={(margins) => onChange({ ...settings, margins })}
      />

      <FilenameInput
        value={settings.filename}
        onChange={(filename) => onChange({ ...settings, filename })}
      />

      <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Advanced output
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
            Fine-tune document quality and add professional metadata to the exported PDF.
          </p>
        </div>

        <RangeInput
          label="Output quality"
          hint="Higher quality keeps more image detail but can increase file size."
          value={settings.compressionQuality}
          min={10}
          max={100}
          onChange={(compressionQuality) => onChange({ ...settings, compressionQuality })}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="PDF title"
            value={settings.metadata.title}
            placeholder="Quarterly report"
            onChange={(title) => onChange({ ...settings, metadata: { ...settings.metadata, title } })}
          />
          <TextInput
            label="Author"
            value={settings.metadata.author}
            placeholder="Slipwise"
            onChange={(author) => onChange({ ...settings, metadata: { ...settings.metadata, author } })}
          />
          <TextInput
            label="Subject"
            hint="The subject of the PDF document."
            value={settings.metadata.subject}
            placeholder="Client-ready PDF"
            onChange={(subject) => onChange({ ...settings, metadata: { ...settings.metadata, subject } })}
          />
          <TextInput
            label="Keywords"
            hint="Comma-separated keywords for search and indexing."
            value={settings.metadata.keywords}
            placeholder="invoice, receipt, archive"
            onChange={(keywords) => onChange({ ...settings, metadata: { ...settings.metadata, keywords } })}
          />
        </div>

        <ToggleRow
          label="Page numbers"
          hint="Add a footer with page numbers to every exported page."
          checked={settings.pageNumbers.enabled}
          onChange={(enabled) => onChange({ ...settings, pageNumbers: { enabled } })}
        />

        <ToggleRow
          label="Enable searchable PDF (OCR)"
          hint="Extract text from images to make the PDF content searchable."
          checked={settings.enableOcr}
          onChange={(enableOcr) => onChange({ ...settings, enableOcr })}
        />

        <div className="space-y-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/80 p-3.5">
          <ToggleRow
            label="Watermark"
            hint="Overlay a subtle text watermark across each page."
            checked={settings.watermark.enabled}
            onChange={(enabled) => onChange({ ...settings, watermark: { ...settings.watermark, enabled } })}
          />

          {settings.watermark.enabled ? (
            <>
              <TextInput
                label="Watermark text"
                value={settings.watermark.text}
                placeholder="CONFIDENTIAL"
                onChange={(text) => onChange({ ...settings, watermark: { ...settings.watermark, text } })}
              />
              <RangeInput
                label="Watermark opacity"
                value={Math.round(settings.watermark.opacity * 100)}
                min={5}
                max={60}
                onChange={(value) =>
                  onChange({
                    ...settings,
                    watermark: { ...settings.watermark, opacity: value / 100 },
                  })
                }
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
