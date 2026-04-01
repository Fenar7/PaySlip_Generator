"use client";

import type { PageSettings, PageNumberPosition, PageNumberFormat, WatermarkPosition } from "@/features/pdf-studio/types";
import {
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  FIT_MODE_OPTIONS,
  MARGIN_OPTIONS,
} from "@/features/pdf-studio/constants";
import { cn } from "@/lib/utils";
import { ChangeEvent, useRef } from "react";

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

/**
 * Position grid selector for watermarks
 */
function PositionGrid({
  value,
  onChange,
}: {
  value: WatermarkPosition;
  onChange: (position: WatermarkPosition) => void;
}) {
  const positions: { id: WatermarkPosition; label: string; gridArea: string }[] = [
    { id: 'top-left', label: 'Top Left', gridArea: '1/1' },
    { id: 'top-center', label: 'Top Center', gridArea: '1/2' },
    { id: 'top-right', label: 'Top Right', gridArea: '1/3' },
    { id: 'center-left', label: 'Center Left', gridArea: '2/1' },
    { id: 'center', label: 'Center', gridArea: '2/2' },
    { id: 'center-right', label: 'Center Right', gridArea: '2/3' },
    { id: 'bottom-left', label: 'Bottom Left', gridArea: '3/1' },
    { id: 'bottom-center', label: 'Bottom Center', gridArea: '3/2' },
    { id: 'bottom-right', label: 'Bottom Right', gridArea: '3/3' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[0.82rem] font-medium text-[var(--foreground)]">Position</p>
      <div className="grid grid-cols-3 gap-1 p-2 bg-gray-50 rounded-lg">
        {positions.map((pos) => (
          <button
            key={pos.id}
            type="button"
            onClick={() => onChange(pos.id)}
            className={cn(
              "aspect-square rounded-md border-2 transition-colors",
              value === pos.id
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-gray-300 bg-white hover:border-gray-400"
            )}
            title={pos.label}
          >
            <span className="text-xs font-medium">
              {pos.id === 'center' ? '●' : '○'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Color picker input
 */
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border border-[var(--border-soft)] cursor-pointer"
        />
        <div className="flex-1 rounded-[1rem] border border-[var(--border-soft)] bg-white px-3 shadow-[0_10px_24px_rgba(34,34,34,0.035)]">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#999999"
            className="w-full py-2 text-[0.88rem] text-[var(--foreground)] outline-none"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * File input for image watermarks
 */
function ImageUpload({
  label,
  imageUrl,
  onImageSelect,
}: {
  label: string;
  imageUrl?: string;
  onImageSelect: (file: File, url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelect(file, url);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-[1rem] border border-dashed border-[var(--border-soft)] bg-white/60 px-4 py-6 text-center text-[0.82rem] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          {imageUrl ? 'Change image...' : 'Select image...'}
        </button>
        {imageUrl && (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Watermark preview"
              className="w-full max-h-20 object-contain rounded border"
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
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

        {/* Page Numbers Section */}
        <div className="space-y-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/80 p-3.5">
          <ToggleRow
            label="Page numbers"
            hint="Add page numbers to every exported page."
            checked={settings.pageNumbers.enabled}
            onChange={(enabled) => onChange({ ...settings, pageNumbers: { ...settings.pageNumbers, enabled } })}
          />

          {settings.pageNumbers.enabled && (
            <>
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
            </>
          )}
        </div>

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
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
