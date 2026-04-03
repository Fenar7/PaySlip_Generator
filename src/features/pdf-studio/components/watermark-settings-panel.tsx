"use client";

import type { PageSettings, WatermarkSettings, WatermarkPosition } from "@/features/pdf-studio/types";
import {
  WATERMARK_TYPE_OPTIONS,
  WATERMARK_SCOPE_OPTIONS,
  PDF_STUDIO_SUPPORTED_FORMATS,
} from "@/features/pdf-studio/constants";
import {
  updateWatermarkText,
  updateWatermarkImage,
  updateWatermarkPosition,
  updateWatermarkRotation,
  updateWatermarkScope,
  setWatermarkImageFile,
  enableWatermark,
  disableWatermark,
} from "@/features/pdf-studio/utils/watermark";
import { cn } from "@/lib/utils";
import { ChangeEvent, useCallback, useRef } from "react";

type WatermarkSettingsPanelProps = {
  settings: PageSettings;
  onChange: (settings: PageSettings) => void;
};

type WatermarkTypeOptionProps = {
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
};

function WatermarkTypeOption({
  label,
  hint,
  options,
  value,
  onChange,
}: WatermarkTypeOptionProps) {
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

function SliderInput({
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  unit: string;
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

function ColorInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
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
      <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white px-3.5 py-3.5 shadow-[0_10px_24px_rgba(34,34,34,0.035)]">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 cursor-pointer rounded-[0.8rem] border border-[var(--border-soft)] bg-transparent p-1"
        />
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {value.toUpperCase()}
          </p>
          <p className="text-[0.75rem] leading-6 text-[var(--muted-foreground)]">
            Watermark color
          </p>
        </div>
      </div>
    </div>
  );
}

function PositionGrid({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: WatermarkPosition;
  onChange: (value: WatermarkPosition) => void;
}) {
  const positions: { value: WatermarkPosition; label: string }[] = [
    { value: 'top-left', label: 'TL' },
    { value: 'top-center', label: 'TC' },
    { value: 'top-right', label: 'TR' },
    { value: 'center-left', label: 'CL' },
    { value: 'center', label: 'CC' },
    { value: 'center-right', label: 'CR' },
    { value: 'bottom-left', label: 'BL' },
    { value: 'bottom-center', label: 'BC' },
    { value: 'bottom-right', label: 'BR' },
  ];

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {positions.map((position) => (
          <button
            key={position.value}
            type="button"
            onClick={() => onChange(position.value)}
            className={cn(
              "aspect-square rounded-[0.9rem] border px-3 py-2.5 text-center text-[0.8rem] font-medium transition-colors",
              value === position.value
                ? "border-[var(--accent)] bg-white text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:border-[var(--border-strong)] hover:bg-white",
            )}
          >
            {position.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageUploadSection({
  watermark,
  onChange,
}: {
  watermark: WatermarkSettings;
  onChange: (settings: PageSettings) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File | null) => {
      if (!file) {
        const newSettings = setWatermarkImageFile(
          { watermark } as PageSettings,
          null
        );
        onChange(newSettings);
        return;
      }

      // Validate file type
      if (!PDF_STUDIO_SUPPORTED_FORMATS.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, WEBP, HEIC, HEIF)");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      const newSettings = setWatermarkImageFile(
        { watermark } as PageSettings,
        file
      );
      onChange(newSettings);
    },
    [watermark, onChange]
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileSelect(file);
    // Reset input to allow selecting the same file again
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">Image Upload</p>
        <p className="text-[0.75rem] leading-5 text-[var(--muted-foreground)]">
          Upload an image to use as watermark. Max 5MB.
        </p>
      </div>

      <div className="space-y-3 rounded-[1rem] border border-[var(--border-soft)] bg-white p-4 shadow-[0_10px_24px_rgba(34,34,34,0.035)]">
        <input
          ref={fileInputRef}
          type="file"
          accept={PDF_STUDIO_SUPPORTED_FORMATS.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleUploadClick}
          className="w-full rounded-lg border-2 border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-6 text-center transition-colors hover:border-[var(--accent)] hover:bg-white"
        >
          <div className="space-y-2">
            <div className="mx-auto h-8 w-8 text-[var(--muted-foreground)]">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <div>
              <p className="text-[0.8rem] font-medium text-[var(--foreground)]">
                Click to upload image
              </p>
              <p className="text-[0.75rem] text-[var(--muted-foreground)]">
                JPEG, PNG, WEBP, HEIC, or HEIF
              </p>
            </div>
          </div>
        </button>

        {watermark.image?.previewUrl && (
          <div className="flex items-center justify-between rounded-[0.9rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-3">
            <div className="flex items-center gap-3">
              <img
                src={watermark.image.previewUrl}
                alt="Watermark preview"
                className="h-12 w-12 rounded-[0.6rem] object-cover"
              />
              <div>
                <p className="text-[0.8rem] font-medium text-[var(--foreground)]">
                  {watermark.image.file?.name || "Watermark image"}
                </p>
                <p className="text-[0.75rem] text-[var(--muted-foreground)]">
                  {watermark.image.file && `${Math.round(watermark.image.file.size / 1024)} KB`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleFileSelect(null)}
              className="text-[0.75rem] font-medium text-[var(--foreground)] underline decoration-[var(--accent)] underline-offset-4 hover:text-[var(--accent)]"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WatermarkSettingsPanel({ settings, onChange }: WatermarkSettingsPanelProps) {
  const { watermark } = settings;

  const handleTypeChange = useCallback(
    (type: string) => {
      if (type === 'none') {
        onChange(disableWatermark(settings));
      } else if (type === 'text' || type === 'image') {
        onChange(enableWatermark(settings, type));
      }
    },
    [settings, onChange]
  );

  const handleTextContentChange = useCallback(
    (content: string) => {
      onChange(updateWatermarkText(settings, { content }));
    },
    [settings, onChange]
  );

  const handleFontSizeChange = useCallback(
    (fontSize: number) => {
      onChange(updateWatermarkText(settings, { fontSize }));
    },
    [settings, onChange]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      onChange(updateWatermarkText(settings, { color }));
    },
    [settings, onChange]
  );

  const handleTextOpacityChange = useCallback(
    (opacity: number) => {
      onChange(updateWatermarkText(settings, { opacity }));
    },
    [settings, onChange]
  );

  const handleImageScaleChange = useCallback(
    (scale: number) => {
      onChange(updateWatermarkImage(settings, { scale }));
    },
    [settings, onChange]
  );

  const handleImageOpacityChange = useCallback(
    (opacity: number) => {
      onChange(updateWatermarkImage(settings, { opacity }));
    },
    [settings, onChange]
  );

  const handlePositionChange = useCallback(
    (position: WatermarkPosition) => {
      onChange(updateWatermarkPosition(settings, position));
    },
    [settings, onChange]
  );

  const handleRotationChange = useCallback(
    (rotation: number) => {
      onChange(updateWatermarkRotation(settings, rotation));
    },
    [settings, onChange]
  );

  const handleScopeChange = useCallback(
    (scope: string) => {
      if (scope === 'all' || scope === 'first') {
        onChange(updateWatermarkScope(settings, scope));
      }
    },
    [settings, onChange]
  );

  return (
    <div className="space-y-6">
      {/* Watermark Type Selection */}
      <WatermarkTypeOption
        label="Watermark"
        hint="Add a watermark to your PDF pages."
        options={WATERMARK_TYPE_OPTIONS}
        value={watermark.enabled && watermark.type !== 'none' ? watermark.type : 'none'}
        onChange={handleTypeChange}
      />

      {/* Text Watermark Settings */}
      {watermark.enabled && watermark.type === 'text' && (
        <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
          <TextInput
            label="Text Content"
            hint="The text to display as watermark."
            value={watermark.text?.content || ''}
            placeholder="CONFIDENTIAL"
            onChange={handleTextContentChange}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <SliderInput
              label="Font Size"
              value={watermark.text?.fontSize || 24}
              min={12}
              max={72}
              unit="px"
              onChange={handleFontSizeChange}
            />

            <SliderInput
              label="Opacity"
              value={watermark.text?.opacity || 50}
              min={5}
              max={100}
              unit="%"
              onChange={handleTextOpacityChange}
            />
          </div>

          <ColorInput
            label="Color"
            hint="Choose the watermark text color."
            value={watermark.text?.color || '#999999'}
            onChange={handleColorChange}
          />
        </div>
      )}

      {/* Image Watermark Settings */}
      {watermark.enabled && watermark.type === 'image' && (
        <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
          <ImageUploadSection watermark={watermark} onChange={onChange} />

          <div className="grid gap-4 md:grid-cols-2">
            <SliderInput
              label="Scale"
              hint="Size of the watermark image."
              value={watermark.image?.scale || 30}
              min={10}
              max={100}
              unit="%"
              onChange={handleImageScaleChange}
            />

            <SliderInput
              label="Opacity"
              value={watermark.image?.opacity || 50}
              min={5}
              max={100}
              unit="%"
              onChange={handleImageOpacityChange}
            />
          </div>
        </div>
      )}

      {/* Position and Rotation Settings (shown for both text and image) */}
      {watermark.enabled && watermark.type !== 'none' && (
        <div className="space-y-4">
          <PositionGrid
            label="Position"
            hint="Choose where to place the watermark on each page."
            value={watermark.position}
            onChange={handlePositionChange}
          />

          <SliderInput
            label="Rotation"
            hint="Rotate the watermark (in degrees)."
            value={watermark.rotation}
            min={0}
            max={360}
            unit="°"
            onChange={handleRotationChange}
          />

          <WatermarkTypeOption
            label="Apply to"
            hint="Choose which pages should have the watermark."
            options={WATERMARK_SCOPE_OPTIONS}
            value={watermark.scope}
            onChange={handleScopeChange}
          />
        </div>
      )}
    </div>
  );
}