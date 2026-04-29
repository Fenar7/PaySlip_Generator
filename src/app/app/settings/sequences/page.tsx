"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSequenceSettings,
  updateSequenceSettings,
  seedSequenceSetting,
  getSequenceHistory,
} from "./actions";
import type { SequenceSettingsData } from "./actions";
import type { SequenceDocumentType, SequencePeriodicity } from "@/features/sequences/types";

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

  // Continuity seed state
  const [seedDocType, setSeedDocType] = useState<SequenceDocumentType>("INVOICE");
  const [seedNumber, setSeedNumber] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);

  // History state
  const [historyDocType, setHistoryDocType] = useState<SequenceDocumentType | "ALL">("ALL");
  const [history, setHistory] = useState<Array<{
    id: string;
    action: string;
    actor: { name: string } | null;
    createdAt: Date;
    metadata: unknown;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

      {isOwner && (
        <ContinuitySeedSection
          docType={seedDocType}
          onDocTypeChange={setSeedDocType}
          number={seedNumber}
          onNumberChange={setSeedNumber}
          loading={seedLoading}
          onSeed={async () => {
            if (!activeOrg?.id) return;
            setSeedLoading(true);
            setError(null);
            setSuccess(null);
            try {
              const result = await seedSequenceSetting(activeOrg.id, {
                documentType: seedDocType,
                latestUsedNumber: seedNumber,
              });
              setSuccess(
                `${seedDocType === "INVOICE" ? "Invoice" : "Voucher"} continuity seeded. Next number will be ${result.nextPreview}`
              );
              setSeedNumber("");
              await loadSettings();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to seed continuity");
            } finally {
              setSeedLoading(false);
            }
          }}
        />
      )}

      <HistorySection
        docType={historyDocType}
        onDocTypeChange={setHistoryDocType}
        loading={historyLoading}
        history={history}
        onLoad={async () => {
          if (!activeOrg?.id) return;
          setHistoryLoading(true);
          try {
            const data = await getSequenceHistory(
              activeOrg.id,
              historyDocType === "ALL" ? undefined : historyDocType
            );
            setHistory(data.logs);
          } catch {
            // ignore
          } finally {
            setHistoryLoading(false);
          }
        }}
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


function ContinuitySeedSection({
  docType,
  onDocTypeChange,
  number,
  onNumberChange,
  loading,
  onSeed,
}: {
  docType: SequenceDocumentType;
  onDocTypeChange: (v: SequenceDocumentType) => void;
  number: string;
  onNumberChange: (v: string) => void;
  loading: boolean;
  onSeed: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Continuity Seeding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[#666]">
          If you have already used numbers outside Slipwise, enter the latest used number to
          establish continuity. The next generated number will continue from there.
        </p>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm text-[#666] mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => onDocTypeChange(e.target.value as SequenceDocumentType)}
              className="block w-40 rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
            >
              <option value="INVOICE">Invoice</option>
              <option value="VOUCHER">Voucher</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-[#666] mb-1">Latest Used Number</label>
            <Input
              value={number}
              onChange={(e) => onNumberChange(e.target.value)}
              placeholder="e.g. INV/2026/00042"
              className="max-w-md"
            />
          </div>
          <Button
            onClick={onSeed}
            disabled={loading || !number}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            {loading ? "Seeding..." : "Seed Continuity"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "sequence.created": "Created",
  "sequence.edited": "Edited",
  "sequence.periodicity_changed": "Periodicity Changed",
  "sequence.future_activated": "Future Format Activated",
  "sequence.continuity_seeded": "Continuity Seeded",
  "sequence.resequence_previewed": "Resequence Previewed",
  "sequence.resequence_confirmed": "Resequence Confirmed",
  "sequence.locked_attempt_blocked": "Locked Period Blocked",
};

function HistorySection({
  docType,
  onDocTypeChange,
  loading,
  history,
  onLoad,
}: {
  docType: SequenceDocumentType | "ALL";
  onDocTypeChange: (v: SequenceDocumentType | "ALL") => void;
  loading: boolean;
  history: Array<{
    id: string;
    action: string;
    actor: { name: string } | null;
    createdAt: Date;
    metadata: unknown;
  }>;
  onLoad: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sequence History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-[#666]">Filter:</label>
          <select
            value={docType}
            onChange={(e) => onDocTypeChange(e.target.value as SequenceDocumentType | "ALL")}
            className="block w-40 rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
          >
            <option value="ALL">All</option>
            <option value="INVOICE">Invoice</option>
            <option value="VOUCHER">Voucher</option>
          </select>
          <Button
            onClick={onLoad}
            variant="outline"
            className="border-[#dc2626] text-[#dc2626] hover:bg-red-50"
          >
            {loading ? "Loading..." : "Load History"}
          </Button>
        </div>
        {loading && <p className="text-sm text-[#666]">Loading history...</p>}
        {history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="text-left py-2 px-3 text-[#666] font-medium">Time</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium">Action</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium">Actor</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#f5f5f5]">
                    <td className="py-2 px-3 text-[#1a1a1a] whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="secondary">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-[#1a1a1a]">{entry.actor?.name ?? "System"}</td>
                    <td className="py-2 px-3 text-[#666]">
                      {entry.metadata && typeof entry.metadata === "object" && entry.metadata !== null
                        ? Object.entries(entry.metadata as Record<string, unknown>)
                            .filter(([k]) => !k.includes("Id"))
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
