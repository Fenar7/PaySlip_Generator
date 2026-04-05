"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSalaryPreset,
  updateSalaryPreset,
  type PresetComponent,
} from "../../salary-preset-actions";

interface SalaryPresetFormProps {
  preset?: {
    id: string;
    name: string;
    components: PresetComponent[];
  };
}

export function SalaryPresetForm({ preset }: SalaryPresetFormProps) {
  const router = useRouter();
  const isEdit = !!preset;
  const [name, setName] = useState(preset?.name ?? "");
  const [components, setComponents] = useState<PresetComponent[]>(
    preset?.components ?? [
      { label: "Basic Salary", amount: 0, type: "earning" },
      { label: "HRA", amount: 0, type: "earning" },
      { label: "PF Deduction", amount: 0, type: "deduction" },
    ],
  );
  const [isSaving, setIsSaving] = useState(false);

  const addComponent = (type: "earning" | "deduction") => {
    setComponents((prev) => [...prev, { label: "", amount: 0, type }]);
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (
    index: number,
    field: keyof PresetComponent,
    value: string | number,
  ) => {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Name is required");
    setIsSaving(true);
    try {
      const result = isEdit
        ? await updateSalaryPreset(preset.id, { name, components })
        : await createSalaryPreset({ name, components });
      if (result.success) {
        router.push("/app/data/salary-presets");
      } else {
        alert(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const earnings = components.filter((c) => c.type === "earning");
  const deductions = components.filter((c) => c.type === "deduction");
  const totalEarnings = earnings.reduce((s, c) => s + c.amount, 0);
  const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Preset Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Package, Executive CTC"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {/* Earnings */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-green-700">Earnings</h3>
          <button
            type="button"
            onClick={() => addComponent("earning")}
            className="text-xs text-green-600 hover:underline"
          >
            + Add Earning
          </button>
        </div>
        <div className="space-y-2">
          {components.map((comp, i) =>
            comp.type !== "earning" ? null : (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={comp.label}
                  onChange={(e) => updateComponent(i, "label", e.target.value)}
                  placeholder="Label (e.g., Basic Salary)"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={comp.amount}
                  onChange={(e) =>
                    updateComponent(i, "amount", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-right text-sm focus:border-green-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeComponent(i)}
                  className="text-slate-300 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ),
          )}
          {earnings.length === 0 && (
            <p className="text-sm text-slate-400 italic">No earnings added yet</p>
          )}
        </div>
      </div>

      {/* Deductions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-red-700">Deductions</h3>
          <button
            type="button"
            onClick={() => addComponent("deduction")}
            className="text-xs text-red-600 hover:underline"
          >
            + Add Deduction
          </button>
        </div>
        <div className="space-y-2">
          {components.map((comp, i) =>
            comp.type !== "deduction" ? null : (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={comp.label}
                  onChange={(e) => updateComponent(i, "label", e.target.value)}
                  placeholder="Label (e.g., PF Deduction)"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={comp.amount}
                  onChange={(e) =>
                    updateComponent(i, "amount", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-right text-sm focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeComponent(i)}
                  className="text-slate-300 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ),
          )}
          {deductions.length === 0 && (
            <p className="text-sm text-slate-400 italic">No deductions added yet</p>
          )}
        </div>
      </div>

      {/* Summary */}
      {components.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-green-700">
            <span>Gross Pay:</span>
            <span>₹{totalEarnings.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Deductions:</span>
            <span>₹{totalDeductions.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1">
            <span>Net Pay:</span>
            <span>₹{(totalEarnings - totalDeductions).toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isEdit ? "Update Preset" : "Create Preset"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
