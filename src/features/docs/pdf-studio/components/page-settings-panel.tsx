"use client";

import type { PageSettings, PageNumberPosition, PageNumberFormat, WatermarkPosition } from "@/features/docs/pdf-studio/types";
import {
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  FIT_MODE_OPTIONS,
  MARGIN_OPTIONS,
} from "@/features/docs/pdf-studio/constants";
import { formatBytes } from "@/features/docs/pdf-studio/utils/pdf-size-estimator";
import { cn } from "@/lib/utils";
import { ChangeEvent, useState } from "react";
import { PasswordSettingsPanel } from "./password-settings-panel";

type PageSettingsPanelProps = {
  settings: PageSettings;
  onChange: (settings: PageSettings) => void;
  estimatedPdfSizeBytes?: number | null;
  estimateStatus?: "idle" | "estimating" | "ready" | "error";
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
                ? "border-[var(--accent)] bg-white text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:border-[var(--border-strong)] hover:bg-white",
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
  unit = "%",
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
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
        <span className="text-[0.78rem] font-medium text-[var(--foreground-soft)]">{value}{unit}</span>
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

export function PageSettingsPanel({
  settings,
  onChange,
  estimatedPdfSizeBytes,
  estimateStatus = "idle",
}: PageSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'password'>('general');

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'advanced' as const, label: 'Advanced', icon: '🔧' },
    { id: 'password' as const, label: 'Password', icon: '🔒' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-soft)]">
        <nav className="flex space-x-8" aria-label="Settings tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-[0.85rem] font-medium transition-colors",
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              )}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <GeneralSettingsTab settings={settings} onChange={onChange} />
      )}
      
      {activeTab === 'advanced' && (
        <AdvancedSettingsTab
          settings={settings}
          onChange={onChange}
          estimatedPdfSizeBytes={estimatedPdfSizeBytes}
          estimateStatus={estimateStatus}
        />
      )}
      
      {activeTab === 'password' && (
        <PasswordSettingsPanel 
          settings={settings.password} 
          onSettingsChange={(passwordSettings) => 
            onChange({ ...settings, password: passwordSettings })
          } 
        />
      )}
    </div>
  );
}

// Tab Components
function GeneralSettingsTab({ settings, onChange }: PageSettingsPanelProps) {
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
    </div>
  );
}

function AdvancedSettingsTab({
  settings,
  onChange,
  estimatedPdfSizeBytes,
  estimateStatus = "idle",
}: PageSettingsPanelProps) {
  const estimateMessage =
    estimateStatus === "estimating"
      ? "Estimating size..."
      : estimateStatus === "error"
        ? "Could not estimate size"
        : estimateStatus === "ready" && typeof estimatedPdfSizeBytes === "number"
          ? `Estimated file size: ${formatBytes(estimatedPdfSizeBytes)}`
          : "Estimated file size will appear after images are added";

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Document quality
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
            Control output quality and compression settings.
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

        <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(34,34,34,0.025)]">
          <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{estimateMessage}</p>
          <p className="mt-1 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">
            Estimate is based on current quality and image settings. Final size may vary slightly.
          </p>
        </div>

        <ToggleRow
          label="Enable searchable PDF (OCR)"
          hint="Extract text from images to make the PDF content searchable. English OCR runs locally in your browser — large images may take longer."
          checked={settings.enableOcr}
          onChange={(enableOcr) => onChange({ ...settings, enableOcr })}
        />
      </div>

      <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Metadata
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
            Add professional metadata to your PDF document.
          </p>
        </div>

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
      </div>

      {/* Page Numbers Section */}
      <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Page numbers
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
            Add page numbers to your PDF pages.
          </p>
        </div>

        <ToggleRow
          label="Enable page numbers"
          hint="Add page numbers to every exported page."
          checked={settings.pageNumbers.enabled}
          onChange={(enabled) => onChange({ ...settings, pageNumbers: { ...settings.pageNumbers, enabled } })}
        />

        {settings.pageNumbers.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Position</label>
                <select
                  value={settings.pageNumbers.position}
                  onChange={(e) => onChange({
                    ...settings,
                    pageNumbers: { ...settings.pageNumbers, position: e.target.value as PageNumberPosition }
                  })}
                  className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Format</label>
                <select
                  value={settings.pageNumbers.format}
                  onChange={(e) => onChange({
                    ...settings,
                    pageNumbers: { ...settings.pageNumbers, format: e.target.value as PageNumberFormat }
                  })}
                  className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm"
                >
                  <option value="number">1</option>
                  <option value="page-number">Page 1</option>
                  <option value="number-of-total">1 of 5</option>
                  <option value="page-number-of-total">Page 1 of 5</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Start from"
                value={settings.pageNumbers.startFrom.toString()}
                placeholder="1"
                onChange={(value) => onChange({
                  ...settings,
                  pageNumbers: { ...settings.pageNumbers, startFrom: parseInt(value) || 1 }
                })}
              />
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="skip-first-page"
                  checked={settings.pageNumbers.skipFirstPage}
                  onChange={(e) => onChange({
                    ...settings,
                    pageNumbers: { ...settings.pageNumbers, skipFirstPage: e.target.checked }
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="skip-first-page" className="text-sm text-[var(--foreground)]">
                  Skip first page
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Watermark Section */}
      <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Watermark
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
            Add a text or image watermark to your PDF pages.
          </p>
        </div>

        <ToggleRow
          label="Enable watermark"
          hint="Overlay a subtle text watermark across each page."
          checked={settings.watermark.enabled}
          onChange={(enabled) => onChange({ ...settings, watermark: { ...settings.watermark, enabled } })}
        />

        {settings.watermark.enabled && (
          <div className="space-y-4">
            {/* Watermark Type Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="watermark-type"
                    value="text"
                    checked={settings.watermark.type === 'text'}
                    onChange={() => onChange({ ...settings, watermark: { ...settings.watermark, type: 'text' } })}
                  />
                  <span className="text-sm">Text</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="watermark-type"
                    value="image"
                    checked={settings.watermark.type === 'image'}
                    onChange={() => onChange({ ...settings, watermark: { ...settings.watermark, type: 'image' } })}
                  />
                  <span className="text-sm">Image</span>
                </label>
              </div>
            </div>

            {settings.watermark.type === 'text' && (
              <>
                <TextInput
                  label="Watermark text"
                  value={settings.watermark.text?.content || ''}
                  placeholder="CONFIDENTIAL"
                  onChange={(content) => onChange({
                    ...settings,
                    watermark: {
                      ...settings.watermark,
                      text: { ...settings.watermark.text!, content }
                    }
                  })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <RangeInput
                    label="Font size"
                    value={settings.watermark.text?.fontSize || 24}
                    min={12}
                    max={72}
                    onChange={(fontSize) => onChange({
                      ...settings,
                      watermark: {
                        ...settings.watermark,
                        text: { ...settings.watermark.text!, fontSize }
                      }
                    })}
                  />
                  <RangeInput
                    label="Opacity"
                    value={settings.watermark.text?.opacity || 50}
                    min={5}
                    max={100}
                    onChange={(opacity) => onChange({
                      ...settings,
                      watermark: {
                        ...settings.watermark,
                        text: { ...settings.watermark.text!, opacity }
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.watermark.text?.color || '#999999'}
                      onChange={(e) => onChange({
                        ...settings,
                        watermark: {
                          ...settings.watermark,
                          text: { ...settings.watermark.text!, color: e.target.value }
                        }
                      })}
                      className="w-10 h-8 rounded border border-[var(--border-soft)] cursor-pointer"
                    />
                    <div className="flex-1 rounded-[1rem] border border-[var(--border-soft)] bg-white px-3 shadow-[0_10px_24px_rgba(34,34,34,0.035)]">
                      <input
                        type="text"
                        value={settings.watermark.text?.color || '#999999'}
                        onChange={(e) => onChange({
                          ...settings,
                          watermark: {
                            ...settings.watermark,
                            text: { ...settings.watermark.text!, color: e.target.value }
                          }
                        })}
                        placeholder="#999999"
                        className="w-full py-2 text-[0.88rem] text-[var(--foreground)] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {settings.watermark.type === 'image' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        onChange({
                          ...settings,
                          watermark: {
                            ...settings.watermark,
                            image: { ...settings.watermark.image!, file, previewUrl }
                          }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RangeInput
                    label="Scale"
                    value={settings.watermark.image?.scale || 30}
                    min={10}
                    max={100}
                    onChange={(scale) => onChange({
                      ...settings,
                      watermark: {
                        ...settings.watermark,
                        image: { ...settings.watermark.image!, scale }
                      }
                    })}
                  />
                  <RangeInput
                    label="Opacity"
                    value={settings.watermark.image?.opacity || 50}
                    min={5}
                    max={100}
                    onChange={(opacity) => onChange({
                      ...settings,
                      watermark: {
                        ...settings.watermark,
                        image: { ...settings.watermark.image!, opacity }
                      }
                    })}
                  />
                </div>
              </>
            )}

            {/* Position Grid */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Position</label>
              <div className="grid grid-cols-3 gap-2 max-w-[200px]">
                {[
                  ['top-left', 'TL'], ['top-center', 'TC'], ['top-right', 'TR'],
                  ['center-left', 'CL'], ['center', 'CC'], ['center-right', 'CR'],
                  ['bottom-left', 'BL'], ['bottom-center', 'BC'], ['bottom-right', 'BR']
                ].map(([position, label]) => (
                  <button
                    key={position}
                    type="button"
                    onClick={() => onChange({
                      ...settings,
                      watermark: { ...settings.watermark, position: position as WatermarkPosition }
                    })}
                    className={`px-2 py-1 text-xs border rounded ${
                      settings.watermark.position === position
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border-soft)] bg-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <RangeInput
                label="Rotation"
                value={settings.watermark.rotation}
                min={-180}
                max={180}
                unit="°"
                onChange={(rotation) => onChange({
                  ...settings,
                  watermark: { ...settings.watermark, rotation }
                })}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Apply to</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="watermark-scope"
                      value="all"
                      checked={settings.watermark.scope === 'all'}
                      onChange={() => onChange({ ...settings, watermark: { ...settings.watermark, scope: 'all' } })}
                    />
                    <span className="text-sm">All Pages</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="watermark-scope"
                      value="first"
                      checked={settings.watermark.scope === 'first'}
                      onChange={() => onChange({ ...settings, watermark: { ...settings.watermark, scope: 'first' } })}
                    />
                    <span className="text-sm">First Only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
