"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSequenceSettings, updateSequenceSettings } from "./actions";
import type { SequenceSettingsData } from "./actions";
import type { SequencePeriodicity } from "@/features/sequences/types";

const PERIODICITY_LABELS: Record<SequencePeriodicity, string> = {
  NONE: "No reset (continuous)",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  FINANCIAL_YEAR: "Financial Year",
};

export default function SequenceSettingsPage() {
  const { activeOrg } = useActiveOrg();
  const { role } = usePermissions();
  const isOwner = role === "owner";

  const [invoiceSettings, setInvoiceSettings] = useState<SequenceSettingsData | null>(null);
  const [voucherSettings, setVoucherSettings] = useState<SequenceSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"INVOICE" | "VOUCHER" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [invoiceFormat, setInvoiceFormat] = useState("");
  const [invoicePeriodicity, setInvoicePeriodicity] = useState<SequencePeriodicity>("YEARLY");
  const [voucherFormat, setVoucherFormat] = useState("");
  const [voucherPeriodicity, setVoucherPeriodicity] = useState<SequencePeriodicity>("YEARLY");

  const loadSettings = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const data = await getSequenceSettings(activeOrg.id);
      setInvoiceSettings(data.invoice);
      setVoucherSettings(data.voucher);
      if (data.invoice) {
        setInvoiceFormat(data.invoice.formatString ?? "INV/{YYYY}/{NNNNN}");
        setInvoicePeriodicity(data.invoice.periodicity);
      }
      if (data.voucher) {
        setVoucherFormat(data.voucher.formatString ?? "VCH/{YYYY}/{NNNNN}");
        setVoucherPeriodicity(data.voucher.periodicity);
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (documentType: "INVOICE" | "VOUCHER") => {
    if (!activeOrg?.id || !isOwner) return;
    setSaving(documentType);
    setError(null);
    setSuccess(null);

    try {
      const formatString = documentType === "INVOICE" ? invoiceFormat : voucherFormat;
      const periodicity = documentType === "INVOICE" ? invoicePeriodicity : voucherPeriodicity;

      await updateSequenceSettings(activeOrg.id, {
        documentType,
        formatString,
        periodicity,
      });

      setSuccess(
        `${documentType === "INVOICE" ? "Invoice" : "Voucher"} sequence updated successfully`
      );
      await loadSettings();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update sequence settings"
      );
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-[#666]">Loading sequence settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Document Numbering</h2>
        <p className="text-sm text-[#666] mt-1">
          Configure how invoice and voucher numbers are generated.
          {isOwner ? "" : " Only the owner can edit these settings."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <SequenceCard
        title="Invoice Sequence"
        settings={invoiceSettings}
        formatValue={invoiceFormat}
        onFormatChange={setInvoiceFormat}
        periodicityValue={invoicePeriodicity}
        onPeriodicityChange={setInvoicePeriodicity}
        isOwner={isOwner}
        saving={saving === "INVOICE"}
        onSave={() => handleSave("INVOICE")}
      />

      <SequenceCard
        title="Voucher Sequence"
        settings={voucherSettings}
        formatValue={voucherFormat}
        onFormatChange={setVoucherFormat}
        periodicityValue={voucherPeriodicity}
        onPeriodicityChange={setVoucherPeriodicity}
        isOwner={isOwner}
        saving={saving === "VOUCHER"}
        onSave={() => handleSave("VOUCHER")}
      />
    </div>
  );
}

function SequenceCard({
  title,
  settings,
  formatValue,
  onFormatChange,
  periodicityValue,
  onPeriodicityChange,
  isOwner,
  saving,
  onSave,
}: {
  title: string;
  settings: SequenceSettingsData | null;
  formatValue: string;
  onFormatChange: (v: string) => void;
  periodicityValue: SequencePeriodicity;
  onPeriodicityChange: (v: SequencePeriodicity) => void;
  isOwner: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  if (!settings) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-[#666]">
            No {title.toLowerCase()} configured yet. Run the migration script to set up the initial
            sequence.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant={settings.isActive ? "default" : "secondary"}>
            {settings.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#666]">Current Format</p>
            <p className="font-medium text-[#1a1a1a]">{settings.formatString}</p>
          </div>
          <div>
            <p className="text-[#666]">Periodicity</p>
            <p className="font-medium text-[#1a1a1a]">
              {PERIODICITY_LABELS[settings.periodicity]}
            </p>
          </div>
          <div>
            <p className="text-[#666]">Current Counter</p>
            <p className="font-medium text-[#1a1a1a]">{settings.currentCounter ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#666]">Next Number Preview</p>
            <p className="font-medium text-[#1a1a1a]">{settings.nextPreview ?? "—"}</p>
          </div>
        </div>

        {isOwner && (
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-medium text-[#1a1a1a]">Update Format</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#666] mb-1">Format String</label>
                <Input
                  value={formatValue}
                  onChange={(e) => onFormatChange(e.target.value)}
                  placeholder="INV/{YYYY}/{NNNNN}"
                  className="max-w-md"
                />
                <p className="text-xs text-[#999] mt-1">
                  Valid tokens: {"{YYYY}"}, {"{MM}"}, {"{DD}"}, {"{NNNNN}"}, {"{FY}"}
                </p>
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1">Periodicity</label>
                <select
                  value={periodicityValue}
                  onChange={(e) => onPeriodicityChange(e.target.value as SequencePeriodicity)}
                  className="block w-full max-w-md rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-0"
                >
                  {Object.entries(PERIODICITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={onSave}
                disabled={saving || !formatValue}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
