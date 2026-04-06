"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  PASSPORT_PRESETS,
  type PassportPreset,
} from "@/features/pixel/data/passport-presets";

interface PassportPresetSelectorProps {
  selected: PassportPreset | null;
  onSelect: (preset: PassportPreset) => void;
}

export function PassportPresetSelector({
  selected,
  onSelect,
}: PassportPresetSelectorProps) {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? PASSPORT_PRESETS.filter(
          (p) =>
            p.country.toLowerCase().includes(q) ||
            p.documentType.toLowerCase().includes(q),
        )
      : PASSPORT_PRESETS;

    const groups: Record<string, PassportPreset[]> = {};
    for (const preset of filtered) {
      if (!groups[preset.country]) groups[preset.country] = [];
      groups[preset.country].push(preset);
    }
    return groups;
  }, [search]);

  return (
    <div className="space-y-3">
      <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
        Document Preset
      </label>
      <Input
        placeholder="Search country or document…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-60 overflow-y-auto rounded-xl border border-[#e5e5e5] bg-white">
        {Object.entries(grouped).map(([country, presets]) => (
          <div key={country}>
            <div className="sticky top-0 bg-[#f9f9f9] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#666] border-b border-[#e5e5e5]">
              {country}
            </div>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelect(preset)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-[#f5f5f5] transition-colors flex justify-between items-center",
                  selected?.id === preset.id &&
                    "bg-red-50 text-[var(--accent)] font-medium",
                )}
              >
                <span>{preset.documentType}</span>
                <span className="text-xs text-[#999]">
                  {preset.widthMm}×{preset.heightMm}mm •{" "}
                  {preset.widthPx}×{preset.heightPx}px
                </span>
              </button>
            ))}
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="px-3 py-4 text-sm text-[#999] text-center">
            No presets found
          </p>
        )}
      </div>
    </div>
  );
}
