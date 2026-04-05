"use client";

import type { AdjustmentValues } from "@/features/pixel/utils/image-adjustments";
import { Button } from "@/components/ui";

interface PassportAdjustPanelProps {
  adjustments: AdjustmentValues;
  bw: boolean;
  onChange: (adjustments: AdjustmentValues) => void;
  onBwChange: (bw: boolean) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-[#666] w-20 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="text-xs text-[#999] w-9 text-right">{value}</span>
    </div>
  );
}

export function PassportAdjustPanel({
  adjustments,
  bw,
  onChange,
  onBwChange,
}: PassportAdjustPanelProps) {
  const update = (key: keyof AdjustmentValues, value: number) => {
    onChange({ ...adjustments, [key]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
          Adjustments
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange({ brightness: 0, contrast: 0, saturation: 0 });
            onBwChange(false);
          }}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-2.5 rounded-xl border border-[#e5e5e5] bg-white p-4">
        <Slider
          label="Brightness"
          value={adjustments.brightness}
          min={-100}
          max={100}
          onChange={(v) => update("brightness", v)}
        />
        <Slider
          label="Contrast"
          value={adjustments.contrast}
          min={-100}
          max={100}
          onChange={(v) => update("contrast", v)}
        />
        <Slider
          label="Saturation"
          value={adjustments.saturation}
          min={-100}
          max={100}
          onChange={(v) => update("saturation", v)}
        />
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={bw}
            onChange={(e) => onBwChange(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span className="text-xs text-[#666]">Black &amp; White</span>
        </label>
      </div>
    </div>
  );
}
