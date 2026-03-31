"use client";

import type { PageSettings } from "@/features/pdf-studio/types";
import {
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  FIT_MODE_OPTIONS,
  MARGIN_OPTIONS,
} from "@/features/pdf-studio/constants";
import { cn } from "@/lib/utils";

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

export function PageSettingsPanel({ settings, onChange }: PageSettingsPanelProps) {
  return (
    <div className="space-y-5">
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
    </div>
  );
}
