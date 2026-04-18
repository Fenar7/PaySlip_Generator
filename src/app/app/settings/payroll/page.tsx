"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  getPayrollSettings,
  updatePayrollSettings,
  type PayrollSettingsData,
} from "./actions";

const PT_SLABS_MAHARASHTRA = [
  { upTo: 7500, ptMonthly: 0 },
  { upTo: 10000, ptMonthly: 175 },
  { upTo: null, ptMonthly: 200 },
];

export default function PayrollSettingsPage() {
  const [settings, setSettings] = useState<PayrollSettingsData>({
    pfEnabled: true,
    esiEnabled: true,
    defaultTaxRegime: "new",
    professionalTaxState: null,
    professionalTaxSlabs: [],
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPayrollSettings().then((result) => {
      if (result.success) setSettings(result.data);
    });
  }, []);

  function handleApplyMaharashtraDefaults() {
    setSettings((prev) => ({
      ...prev,
      professionalTaxState: "MH",
      professionalTaxSlabs: PT_SLABS_MAHARASHTRA,
    }));
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updatePayrollSettings(settings);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Payroll Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure statutory deductions, tax regime, and professional tax slabs
        </p>
      </div>

      {/* Statutory toggles */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Statutory Deductions
        </h2>

        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Provident Fund (PF)</div>
            <div className="text-xs text-zinc-500">
              12% employee + 13% employer on Basic (capped at ₹15,000 wage
              ceiling)
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.pfEnabled}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, pfEnabled: e.target.checked }))
            }
            className="w-5 h-5 rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              Employees&apos; State Insurance (ESI)
            </div>
            <div className="text-xs text-zinc-500">
              0.75% employee + 3.25% employer — applies when gross ≤ ₹21,000
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.esiEnabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                esiEnabled: e.target.checked,
              }))
            }
            className="w-5 h-5 rounded"
          />
        </label>
      </section>

      {/* Tax regime */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Default Tax Regime (TDS)
        </h2>
        <div className="flex gap-4">
          {(["new", "old"] as const).map((regime) => (
            <label key={regime} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="taxRegime"
                value={regime}
                checked={settings.defaultTaxRegime === regime}
                onChange={() =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultTaxRegime: regime,
                  }))
                }
              />
              <span className="text-sm font-medium capitalize">
                {regime} Regime{regime === "new" ? " (Default — §115BAC)" : " (Deductions allowed)"}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Professional Tax */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">
            Professional Tax (PT)
          </h2>
          <Button
            variant="secondary"
            onClick={handleApplyMaharashtraDefaults}
          >
            Load Maharashtra Slabs
          </Button>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
            State Code
          </label>
          <input
            type="text"
            value={settings.professionalTaxState ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                professionalTaxState: e.target.value || null,
              }))
            }
            className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm w-32 bg-white dark:bg-zinc-800"
            placeholder="e.g. MH"
          />
        </div>

        <div>
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            PT Slabs (Monthly Gross → PT Amount)
          </div>
          <div className="space-y-2">
            {settings.professionalTaxSlabs.map((slab, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-zinc-500 w-28">
                  Gross up to ₹
                </span>
                <input
                  type="number"
                  value={slab.upTo ?? ""}
                  onChange={(e) => {
                    const slabs = [...settings.professionalTaxSlabs];
                    slabs[idx] = {
                      ...slabs[idx],
                      upTo: e.target.value === "" ? null : Number(e.target.value),
                    };
                    setSettings((prev) => ({
                      ...prev,
                      professionalTaxSlabs: slabs,
                    }));
                  }}
                  className="border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 text-sm w-24 bg-white dark:bg-zinc-800"
                  placeholder="No limit"
                />
                <span className="text-sm text-zinc-500">→ PT ₹</span>
                <input
                  type="number"
                  value={slab.ptMonthly}
                  onChange={(e) => {
                    const slabs = [...settings.professionalTaxSlabs];
                    slabs[idx] = {
                      ...slabs[idx],
                      ptMonthly: Number(e.target.value),
                    };
                    setSettings((prev) => ({
                      ...prev,
                      professionalTaxSlabs: slabs,
                    }));
                  }}
                  className="border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 text-sm w-20 bg-white dark:bg-zinc-800"
                />
                <button
                  onClick={() => {
                    const slabs = settings.professionalTaxSlabs.filter(
                      (_, i) => i !== idx
                    );
                    setSettings((prev) => ({
                      ...prev,
                      professionalTaxSlabs: slabs,
                    }));
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  professionalTaxSlabs: [
                    ...prev.professionalTaxSlabs,
                    { upTo: null, ptMonthly: 0 },
                  ],
                }))
              }
              className="text-sm text-indigo-600 hover:underline"
            >
              + Add Slab
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {saved && (
        <div className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
          Settings saved successfully.
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
