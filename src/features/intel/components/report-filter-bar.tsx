"use client";

import { useCallback, useState } from "react";

export interface FilterField {
  key: string;
  label: string;
  type: "select" | "multi-select" | "date" | "text" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: string | string[] | number | undefined;
}

interface ReportFilterBarProps {
  fields: FilterField[];
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onClear: () => void;
}

export function ReportFilterBar({
  fields,
  values,
  onApply,
  onClear,
}: ReportFilterBarProps) {
  const [local, setLocal] = useState<FilterValues>(values);

  const handleChange = useCallback((key: string, value: string | string[] | number | undefined) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = () => onApply(local);

  const handleClear = () => {
    const cleared: FilterValues = {};
    fields.forEach((f) => {
      cleared[f.key] = f.type === "multi-select" ? [] : undefined;
    });
    setLocal(cleared);
    onClear();
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            {field.label}
          </label>
          {field.type === "select" && (
            <select
              className="h-9 rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={(local[field.key] as string) ?? ""}
              onChange={(e) =>
                handleChange(field.key, e.target.value || undefined)
              }
            >
              <option value="">{field.placeholder ?? "All"}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {field.type === "multi-select" && (
            <select
              multiple
              className="h-20 min-w-[140px] rounded-lg border border-[var(--border-soft)] bg-white px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={(local[field.key] as string[]) ?? []}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => o.value
                );
                handleChange(field.key, selected);
              }}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {field.type === "date" && (
            <input
              type="date"
              className="h-9 rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={(local[field.key] as string) ?? ""}
              onChange={(e) =>
                handleChange(field.key, e.target.value || undefined)
              }
            />
          )}
          {field.type === "text" && (
            <input
              type="text"
              placeholder={field.placeholder ?? ""}
              className="h-9 rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={(local[field.key] as string) ?? ""}
              onChange={(e) =>
                handleChange(field.key, e.target.value || undefined)
              }
            />
          )}
          {field.type === "number" && (
            <input
              type="number"
              placeholder={field.placeholder ?? ""}
              className="h-9 w-28 rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={local[field.key] != null ? String(local[field.key]) : ""}
              onChange={(e) =>
                handleChange(
                  field.key,
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          )}
        </div>
      ))}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={handleApply}
          className="h-9 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)] transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="h-9 rounded-lg border border-[var(--border-soft)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
