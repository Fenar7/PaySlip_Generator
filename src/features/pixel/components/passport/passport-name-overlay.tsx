"use client";

import { Input } from "@/components/ui";

interface NameOverlayConfig {
  enabled: boolean;
  name: string;
  date: string;
}

interface PassportNameOverlayProps {
  config: NameOverlayConfig;
  onChange: (config: NameOverlayConfig) => void;
}

export function PassportNameOverlay({
  config,
  onChange,
}: PassportNameOverlayProps) {
  const update = (partial: Partial<NameOverlayConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
          Name &amp; Date Overlay
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          <span className="text-xs text-[#666]">Enable</span>
        </label>
      </div>

      {config.enabled && (
        <div className="space-y-3 rounded-xl border border-[#e5e5e5] bg-white p-4">
          <Input
            label="Name"
            placeholder="Full name"
            value={config.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={config.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
