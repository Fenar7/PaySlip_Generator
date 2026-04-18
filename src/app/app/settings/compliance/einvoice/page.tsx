"use client";

import { useEffect, useState } from "react";
import { getEInvoiceConfig, upsertEInvoiceConfig } from "@/app/app/compliance/einvoice/actions";

type Config = Awaited<ReturnType<typeof getEInvoiceConfig>>;

export default function EInvoiceConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [gstin, setGstin] = useState("");
  const [autoIrn, setAutoIrn] = useState(false);
  const [autoEwb, setAutoEwb] = useState(false);
  const [transportMode, setTransportMode] = useState("");

  useEffect(() => {
    getEInvoiceConfig()
      .then((c) => {
        setConfig(c);
        if (c) {
          setEnabled(c.enabled);
          setEnv((c.irpEnvironment as "sandbox" | "production") ?? "sandbox");
          setGstin(c.gstin ?? "");
          setAutoIrn(c.autoGenerateIrn);
          setAutoEwb(c.autoGenerateEwb);
          setTransportMode(c.ewbDefaultTransportMode ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await upsertEInvoiceConfig({
      enabled,
      irpEnvironment: env,
      gstin: gstin || undefined,
      autoGenerateIrn: autoIrn,
      autoGenerateEwb: autoEwb,
      ewbDefaultTransportMode: transportMode || undefined,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error);
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-center">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">E-Invoice Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure IRP integration for automated IRN and QR code generation
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
          Configuration saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-white">
          <div>
            <p className="font-medium text-slate-800">Enable E-Invoicing</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Allow IRN generation via NIC IRP for B2B invoices
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-slate-200"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        {enabled && (
          <>
            {/* Environment */}
            <div className="p-4 rounded-lg border bg-white space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IRP Environment</label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value as "sandbox" | "production")}
                  className="border rounded px-3 py-2 text-sm w-full"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production</option>
                </select>
                {env === "production" && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ Production mode will submit real IRN requests to NIC IRP.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN Override</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="Leave blank to use organization GSTIN"
                  maxLength={15}
                  className="border rounded px-3 py-2 text-sm w-full font-mono"
                />
              </div>
            </div>

            {/* Automation */}
            <div className="p-4 rounded-lg border bg-white space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Automation</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoIrn}
                  onChange={(e) => setAutoIrn(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Auto-generate IRN when invoice is issued</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoEwb}
                  onChange={(e) => setAutoEwb(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Auto-generate E-Way Bill with IRN</span>
              </label>

              {autoEwb && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Default Transport Mode</label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-full"
                  >
                    <option value="">Select…</option>
                    <option value="1">Road</option>
                    <option value="2">Rail</option>
                    <option value="3">Air</option>
                    <option value="4">Ship</option>
                  </select>
                </div>
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Configuration"}
        </button>
      </form>
    </div>
  );
}
