"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getOrgI18nSettings,
  updateOrgLanguageSettings,
  updateOrgCountrySettings,
} from "./actions";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/currency/utils";
import { COUNTRY_CONFIGS, SUPPORTED_COUNTRIES } from "@/lib/currency/country-config";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

export default function I18nSettingsPage() {
  // ── Language state ──
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [defaultDocLanguage, setDefaultDocLanguage] = useState("en");

  // ── Country / currency state ──
  const [country, setCountry] = useState("IN");
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [vatRegNumber, setVatRegNumber] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [fiscalYearStart, setFiscalYearStart] = useState("4");

  // ── UI state ──
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    const result = await getOrgI18nSettings();
    if (result.success) {
      setDefaultLanguage(result.data.defaultLanguage);
      setDefaultDocLanguage(result.data.defaultDocLanguage);
      setCountry(result.data.country);
      setBaseCurrency(result.data.baseCurrency as SupportedCurrency);
      setTimezone(result.data.timezone);
      setVatRegNumber(result.data.vatRegNumber ?? "");
      setVatRate(result.data.vatRate != null ? String(result.data.vatRate) : "");
      setFiscalYearStart(String(result.data.fiscalYearStart));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function handleCountryChange(code: string) {
    setCountry(code);
    const config = COUNTRY_CONFIGS[code];
    if (config) {
      setBaseCurrency(config.defaultCurrency);
      setTimezone(config.timezone);
      setFiscalYearStart(String(config.fiscalYearStart));
    }
  }

  async function handleSaveLanguage(e: React.FormEvent) {
    e.preventDefault();
    setSaving("language");
    setSuccess(null);
    setError(null);
    const result = await updateOrgLanguageSettings({
      defaultLanguage,
      defaultDocLanguage,
    });
    setSaving(null);
    if (result.success) {
      setSuccess("language");
    } else {
      setError(result.error);
    }
  }

  async function handleSaveCountry(e: React.FormEvent) {
    e.preventDefault();
    setSaving("country");
    setSuccess(null);
    setError(null);
    const result = await updateOrgCountrySettings({
      country,
      baseCurrency,
      timezone,
      vatRegNumber: vatRegNumber || undefined,
      vatRate: vatRate ? Number(vatRate) : undefined,
      fiscalYearStart: Number(fiscalYearStart),
    });
    setSaving(null);
    if (result.success) {
      setSuccess("country");
    } else {
      setError(result.error);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#666]">Loading settings…</p>;
  }

  const selectClass =
    "w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]";

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      {/* ── Language Settings ── */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">
            Language Settings
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveLanguage} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                App UI Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className={selectClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Document Language
              </label>
              <select
                value={defaultDocLanguage}
                onChange={(e) => setDefaultDocLanguage(e.target.value)}
                className={selectClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#999] mt-1">
                Language used for invoices, salary slips, and other PDF exports.
              </p>
            </div>
            {success === "language" && (
              <p className="text-sm text-green-600">✓ Language settings saved</p>
            )}
            <Button type="submit" disabled={saving === "language"}>
              {saving === "language" ? "Saving…" : "Save language settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Country & Tax Configuration ── */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">
            Country &amp; Tax Configuration
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCountry} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className={selectClass}
              >
                {SUPPORTED_COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {COUNTRY_CONFIGS[code].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Base Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) =>
                  setBaseCurrency(e.target.value as SupportedCurrency)
                }
                className={selectClass}
              >
                {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.symbol} {info.name} ({code})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <Input
              label="VAT / Tax Registration Number"
              value={vatRegNumber}
              onChange={(e) => setVatRegNumber(e.target.value)}
              placeholder={
                COUNTRY_CONFIGS[country]?.vatIdLabel ?? "Tax ID"
              }
            />
            <Input
              label="VAT / Tax Rate (%)"
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              placeholder="e.g. 5"
            />
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Fiscal Year Start Month
              </label>
              <select
                value={fiscalYearStart}
                onChange={(e) => setFiscalYearStart(e.target.value)}
                className={selectClass}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString("en", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
            {success === "country" && (
              <p className="text-sm text-green-600">
                ✓ Country &amp; tax settings saved
              </p>
            )}
            <Button type="submit" disabled={saving === "country"}>
              {saving === "country" ? "Saving…" : "Save country settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
