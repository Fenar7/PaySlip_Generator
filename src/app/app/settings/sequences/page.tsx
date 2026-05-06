"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSequenceSettings,
  initializeSequenceSettings,
  updateSequenceSettings,
  seedSequenceSetting,
  getSequenceHistory,
  getSupportOverview,
  runSequenceHealthCheck,
  diagnoseSequenceHealth,
} from "./actions";
import type { SequenceSettingsData } from "./actions";
import {
  SequenceBuilder,
  SequenceSummary,
  ContinuityBuilder,
} from "@/features/sequences/components/SequenceBuilder";
import { SequenceHistoryPanel } from "@/features/sequences/components/sequence-history-panel";
import {
  buildFormatString,
  parseFormatString,
  getDefaultBuilderConfig,
  derivePeriodicityFromFormat,
  renderPreview,
} from "@/features/sequences/builder";
import type { SequenceBuilderConfig } from "@/features/sequences/builder";
import { getDefaultSequenceConfig } from "@/features/sequences/default-config";
import type { SequenceSupportOverview } from "@/features/sequences/services/sequence-admin";
import type { SequenceDocumentType, HealthCheckReport, HealthCheckFailure } from "@/features/sequences/types";

export default function SequenceSettingsPage() {
  const { activeOrg, isLoading: isOrgLoading } = useActiveOrg();
  const [canEditSettings, setCanEditSettings] = useState<boolean | null>(null);
  // Derive owner status from server response first; fall back to client-side org
  // role because the server-side canEdit check can be out of sync after role changes.
  const isOwner =
    canEditSettings === true ||
    activeOrg?.role === "owner" ||
    activeOrg?.role === "OWNER";
  const editabilityKnown = canEditSettings !== null || activeOrg?.role != null;

  const [invoiceSettings, setInvoiceSettings] = useState<SequenceSettingsData | null>(null);
  const [voucherSettings, setVoucherSettings] = useState<SequenceSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"INVOICE" | "VOUCHER" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Builder state for editing
  const [editingType, setEditingType] = useState<"INVOICE" | "VOUCHER" | null>(null);
  const [invoiceBuilder, setInvoiceBuilder] = useState<SequenceBuilderConfig>(getDefaultBuilderConfig("INVOICE"));
  const [voucherBuilder, setVoucherBuilder] = useState<SequenceBuilderConfig>(getDefaultBuilderConfig("VOUCHER"));
  const [invoiceAdvanced, setInvoiceAdvanced] = useState(false);
  const [voucherAdvanced, setVoucherAdvanced] = useState(false);
  const [invoiceRawFormat, setInvoiceRawFormat] = useState("INV/{YYYY}/{NNNNN}");
  const [voucherRawFormat, setVoucherRawFormat] = useState("VCH/{YYYY}/{NNNNN}");
  const [invoiceSetupSeed, setInvoiceSetupSeed] = useState("");
  const [voucherSetupSeed, setVoucherSetupSeed] = useState("");

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

  // Diagnostics state
  const [diagDocType, setDiagDocType] = useState<SequenceDocumentType>("INVOICE");
  const [diagLoading, setDiagLoading] = useState<"health" | "overview" | "diagnostics" | null>(null);
  const [healthReport, setHealthReport] = useState<HealthCheckReport | null>(null);
  const [supportOverview, setSupportOverview] = useState<SequenceSupportOverview | null>(null);
  const [diagResult, setDiagResult] = useState<{ gaps: number; irregularities: number; warnings: number; criticals: number } | null>(null);
  const [showAdvancedSection, setShowAdvancedSection] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!activeOrg?.id) {
      if (!isOrgLoading) {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const data = await getSequenceSettings(activeOrg.id);
      setInvoiceSettings(data.invoice);
      setVoucherSettings(data.voucher);
      setCanEditSettings(data.canEdit);

      if (data.invoice?.formatString) {
        const parsed = parseFormatString(data.invoice.formatString, "INV");
        if (parsed) {
          setInvoiceBuilder(parsed);
          setInvoiceAdvanced(false);
        } else {
          setInvoiceAdvanced(true);
          setInvoiceRawFormat(data.invoice.formatString);
        }
      }
      if (data.voucher?.formatString) {
        const parsed = parseFormatString(data.voucher.formatString, "VCH");
        if (parsed) {
          setVoucherBuilder(parsed);
          setVoucherAdvanced(false);
        } else {
          setVoucherAdvanced(true);
          setVoucherRawFormat(data.voucher.formatString);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id, isOrgLoading]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const availableSeedDocTypes = [
    invoiceSettings ? "INVOICE" : null,
    voucherSettings ? "VOUCHER" : null,
  ].filter(Boolean) as SequenceDocumentType[];

  useEffect(() => {
    if (availableSeedDocTypes.length === 0) {
      return;
    }

    if (!availableSeedDocTypes.includes(seedDocType)) {
      setSeedDocType(availableSeedDocTypes[0]);
      setSeedNumber("");
    }
  }, [availableSeedDocTypes, seedDocType]);

  const handleSave = async (documentType: "INVOICE" | "VOUCHER") => {
    if (!activeOrg?.id || !isOwner) return;
    setSaving(documentType);
    setError(null);
    setSuccess(null);

    try {
      const isAdvanced = documentType === "INVOICE" ? invoiceAdvanced : voucherAdvanced;
      const rawOrBuilt = documentType === "INVOICE"
        ? (invoiceAdvanced ? invoiceRawFormat : buildFormatString(invoiceBuilder))
        : (voucherAdvanced ? voucherRawFormat : buildFormatString(voucherBuilder));
      const formatString = rawOrBuilt;
      // In advanced mode, derive periodicity from the actual format tokens
      // so the saved periodicity always matches the format string.
      const periodicity = isAdvanced
        ? derivePeriodicityFromFormat(formatString)
        : (documentType === "INVOICE" ? invoiceBuilder.resetCycle : voucherBuilder.resetCycle);

      await updateSequenceSettings(activeOrg.id, {
        documentType,
        formatString,
        periodicity,
      });

      setSuccess(
        `${documentType === "INVOICE" ? "Invoice" : "Voucher"} numbering updated successfully`
      );
      setEditingType(null);
      await loadSettings();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update sequence settings"
      );
    } finally {
      setSaving(null);
    }
  };

  const handleInitialize = async (
    documentType: "INVOICE" | "VOUCHER",
    mode: "defaults" | "custom"
  ) => {
    if (!activeOrg?.id || !isOwner) return;

    setSaving(documentType);
    setError(null);
    setSuccess(null);

    try {
      const isAdvanced = documentType === "INVOICE" ? invoiceAdvanced : voucherAdvanced;
      const builderConfig = documentType === "INVOICE" ? invoiceBuilder : voucherBuilder;
      const formatString = documentType === "INVOICE"
        ? (isAdvanced ? invoiceRawFormat : buildFormatString(invoiceBuilder))
        : (isAdvanced ? voucherRawFormat : buildFormatString(voucherBuilder));
      const periodicity = isAdvanced
        ? derivePeriodicityFromFormat(formatString)
        : builderConfig.resetCycle;
      const latestUsedNumber = documentType === "INVOICE"
        ? invoiceSetupSeed.trim() || undefined
        : voucherSetupSeed.trim() || undefined;

      await initializeSequenceSettings(activeOrg.id, {
        documentType,
        formatString: mode === "custom" ? formatString : undefined,
        periodicity: mode === "custom" ? periodicity : undefined,
        latestUsedNumber,
      });

      setSuccess(
        `${documentType === "INVOICE" ? "Invoice" : "Voucher"} numbering set up successfully`
      );
      setEditingType(null);
      if (documentType === "INVOICE") {
        setInvoiceSetupSeed("");
      } else {
        setVoucherSetupSeed("");
      }
      await loadSettings();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize sequence settings"
      );
    } finally {
      setSaving(null);
    }
  };

  const getFormatString = (type: "INVOICE" | "VOUCHER") => {
    const settings = type === "INVOICE" ? invoiceSettings : voucherSettings;
    return settings?.formatString ?? (type === "INVOICE" ? "INV/{YYYY}/{NNNNN}" : "VCH/{YYYY}/{NNNNN}");
  };

  if (isOrgLoading) {
    return (
      <div className="py-6">
        <p className="text-sm text-[var(--text-muted)]">Loading organization...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <p className="text-sm text-[var(--text-muted)]">Loading sequence settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Document Numbering</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Choose how invoice and voucher numbers look and behave.
          {editabilityKnown && !isOwner ? " Only the owner can edit these settings." : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--state-danger)]/20 bg-[var(--state-danger-soft)] px-4 py-3 text-sm text-[var(--state-danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-[var(--state-success)]/20 bg-[var(--state-success-soft)] px-4 py-3 text-sm text-[var(--state-success)]">
          {success}
        </div>
      )}

      {/* ── A. Everyday setup ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Everyday setup
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <SequenceConfigCard
            documentType="INVOICE"
            settings={invoiceSettings}
            builderConfig={invoiceBuilder}
            isEditing={editingType === "INVOICE"}
            isOwner={isOwner}
            saving={saving === "INVOICE"}
            orgId={activeOrg?.id}
            onInitializeDefault={() => handleInitialize("INVOICE", "defaults")}
            onEdit={() => {
              setEditingType("INVOICE");
              setError(null);
              setSuccess(null);
            }}
            onCancel={() => setEditingType(null)}
            onSave={() =>
              invoiceSettings
                ? handleSave("INVOICE")
                : handleInitialize("INVOICE", "custom")
            }
          >
            {editingType === "INVOICE" && (
              <div className="space-y-4">
                <SequenceBuilder
                  documentType="INVOICE"
                  config={invoiceBuilder}
                  onChange={setInvoiceBuilder}
                  rawFormat={invoiceRawFormat}
                  onRawFormatChange={setInvoiceRawFormat}
                  advancedMode={invoiceAdvanced}
                  onAdvancedModeChange={setInvoiceAdvanced}
                />
                {!invoiceSettings && (
                  <div className="border-t border-[#e5e5e5] pt-4">
                    <ContinuityBuilder
                      documentType="INVOICE"
                      formatString={invoiceAdvanced ? invoiceRawFormat : buildFormatString(invoiceBuilder)}
                      lastUsedNumber={invoiceSetupSeed}
                      onLastUsedNumberChange={setInvoiceSetupSeed}
                      showAction={false}
                    />
                  </div>
                )}
              </div>
            )}
          </SequenceConfigCard>

          <SequenceConfigCard
            documentType="VOUCHER"
            settings={voucherSettings}
            builderConfig={voucherBuilder}
            isEditing={editingType === "VOUCHER"}
            isOwner={isOwner}
            saving={saving === "VOUCHER"}
            orgId={activeOrg?.id}
            onInitializeDefault={() => handleInitialize("VOUCHER", "defaults")}
            onEdit={() => {
              setEditingType("VOUCHER");
              setError(null);
              setSuccess(null);
            }}
            onCancel={() => setEditingType(null)}
            onSave={() =>
              voucherSettings
                ? handleSave("VOUCHER")
                : handleInitialize("VOUCHER", "custom")
            }
          >
            {editingType === "VOUCHER" && (
              <div className="space-y-4">
                <SequenceBuilder
                  documentType="VOUCHER"
                  config={voucherBuilder}
                  onChange={setVoucherBuilder}
                  rawFormat={voucherRawFormat}
                  onRawFormatChange={setVoucherRawFormat}
                  advancedMode={voucherAdvanced}
                  onAdvancedModeChange={setVoucherAdvanced}
                />
                {!voucherSettings && (
                  <div className="border-t border-[#e5e5e5] pt-4">
                    <ContinuityBuilder
                      documentType="VOUCHER"
                      formatString={voucherAdvanced ? voucherRawFormat : buildFormatString(voucherBuilder)}
                      lastUsedNumber={voucherSetupSeed}
                      onLastUsedNumberChange={setVoucherSetupSeed}
                      showAction={false}
                    />
                  </div>
                )}
              </div>
            )}
          </SequenceConfigCard>
        </div>
      </section>

      {/* ── B. Continue from existing numbers ── */}
      {isOwner && availableSeedDocTypes.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Continue from existing numbers
          </h3>
          <div className="rounded-lg border border-[var(--border-soft)] bg-white">
            <div className="border-b border-[var(--border-soft)] px-5 py-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Continue from your last used number</h3>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-[var(--text-muted)]">Document type:</label>
                <select
                  value={seedDocType}
                  onChange={(e) => {
                    setSeedDocType(e.target.value as SequenceDocumentType);
                    setSeedNumber("");
                  }}
                  className="block w-40 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {invoiceSettings ? <option value="INVOICE">Invoice</option> : null}
                  {voucherSettings ? <option value="VOUCHER">Voucher</option> : null}
                </select>
              </div>

              <ContinuityBuilder
                documentType={seedDocType}
                formatString={getFormatString(seedDocType)}
                lastUsedNumber={seedNumber}
                onLastUsedNumberChange={setSeedNumber}
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
                      `${seedDocType === "INVOICE" ? "Invoice" : "Voucher"} continuity saved. Slipwise will next issue ${result.nextPreview}`
                    );
                    setSeedNumber("");
                    await loadSettings();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to save continuity");
                  } finally {
                    setSeedLoading(false);
                  }
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── C. History and troubleshooting ── */}
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvancedSection((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <span>History and troubleshooting</span>
          <span className="text-lg leading-none">{showAdvancedSection ? "−" : "+"}</span>
        </button>

        {showAdvancedSection && (
          <div className="space-y-6">
            {isOwner && (
              <DiagnosticsSection
                orgId={activeOrg?.id ?? ""}
                docType={diagDocType}
                onDocTypeChange={setDiagDocType}
                loading={diagLoading}
                onSetLoading={setDiagLoading}
                healthReport={healthReport}
                onSetHealthReport={setHealthReport}
                supportOverview={supportOverview}
                onSetSupportOverview={setSupportOverview}
                diagResult={diagResult}
                onSetDiagResult={setDiagResult}
                onError={setError}
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
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function SequenceConfigCard({
  documentType,
  settings,
  builderConfig,
  isEditing,
  isOwner,
  saving,
  orgId,
  onInitializeDefault,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  documentType: "INVOICE" | "VOUCHER";
  settings: SequenceSettingsData | null;
  builderConfig: SequenceBuilderConfig;
  isEditing: boolean;
  isOwner: boolean;
  saving: boolean;
  orgId?: string;
  onInitializeDefault: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children?: React.ReactNode;
}) {
  if (!settings) {
    const recommended = getDefaultSequenceConfig(documentType);
    const recommendedPreview = renderPreview(recommended.formatString, recommended.startCounter);

    return (
      <div className="rounded-lg border border-[var(--border-soft)] bg-white">
        <div className="border-b border-[var(--border-soft)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {documentType === "INVOICE" ? "Invoice Numbering" : "Voucher Numbering"}
          </h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          {!isEditing ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                {isOwner
                  ? `This organization has not set up ${documentType === "INVOICE" ? "invoice" : "voucher"} numbering yet.`
                  : `${documentType === "INVOICE" ? "Invoice" : "Voucher"} numbering has not been set up for this organization yet.`}
              </p>
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)]/40 px-4 py-3 space-y-2">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Recommended default
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  {documentType === "INVOICE" ? "Invoices" : "Vouchers"} will start as{" "}
                  <span className="rounded border border-[var(--border-soft)] bg-white px-1.5 py-0.5 font-mono text-xs">
                    {recommendedPreview ?? recommended.formatString}
                  </span>{" "}
                  and reset every year.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  You can keep this recommended setup or customize the prefix, reset cycle, and number length.
                </p>
              </div>
              {isOwner ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={onInitializeDefault}
                    disabled={saving}
                    variant="primary"
                    size="sm"
                    className="h-9 px-4"
                  >
                    {saving ? "Setting up…" : "Use recommended defaults"}
                  </Button>
                  <Button onClick={onEdit} variant="secondary" size="sm" className="h-9 px-4">
                    Customize numbering
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {children}
              <div className="flex gap-2 pt-2">
                <Button onClick={onSave} disabled={saving} variant="primary" size="sm" className="h-9 px-4">
                  {saving ? "Saving…" : "Create numbering"}
                </Button>
                <Button onClick={onCancel} variant="ghost" size="sm" className="h-9 px-4">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-white">
      <div className="border-b border-[var(--border-soft)] px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {documentType === "INVOICE" ? "Invoice Numbering" : "Voucher Numbering"}
          </h3>
          <Badge variant={settings.isActive ? "success" : "warning"}>
            {settings.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {!isEditing ? (
          <SequenceSummary
            documentType={documentType}
            config={builderConfig}
            nextPreview={settings.nextPreview}
            latestIssuedNumber={settings.currentCounter}
          />
        ) : (
          children
        )}

        {isOwner && (
          <div className="flex gap-2 pt-2">
            {!isEditing ? (
              <Button onClick={onEdit} variant="secondary" size="sm" className="h-9 px-4">
                Edit numbering
              </Button>
            ) : (
              <>
                <Button onClick={onSave} disabled={saving} variant="primary" size="sm" className="h-9 px-4">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button onClick={onCancel} variant="ghost" size="sm" className="h-9 px-4">
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}

        {/* History section */}
        {!isEditing && settings.sequenceId && orgId && (
          <details className="group mt-4 border-t border-[var(--border-soft)] pt-4">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              <svg
                className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Version History
            </summary>
            <div className="mt-3">
              <SequenceHistoryPanel
                orgId={orgId}
                sequenceId={settings.sequenceId}
              />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

function DiagnosticsSection({
  orgId,
  docType,
  onDocTypeChange,
  loading,
  onSetLoading,
  healthReport,
  onSetHealthReport,
  supportOverview,
  onSetSupportOverview,
  diagResult,
  onSetDiagResult,
  onError,
}: {
  orgId: string;
  docType: SequenceDocumentType;
  onDocTypeChange: (v: SequenceDocumentType) => void;
  loading: "health" | "overview" | "diagnostics" | null;
  onSetLoading: (v: "health" | "overview" | "diagnostics" | null) => void;
  healthReport: HealthCheckReport | null;
  onSetHealthReport: (v: HealthCheckReport | null) => void;
  supportOverview: SequenceSupportOverview | null;
  onSetSupportOverview: (v: SequenceSupportOverview | null) => void;
  diagResult: { gaps: number; irregularities: number; warnings: number; criticals: number } | null;
  onSetDiagResult: (v: { gaps: number; irregularities: number; warnings: number; criticals: number } | null) => void;
  onError: (v: string | null) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-white">
      <div className="border-b border-[var(--border-soft)] px-5 py-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Diagnostics &amp; Support</h3>
      </div>
      <div className="px-5 py-4 space-y-6">
        <p className="text-sm text-[#666]">
          Investigate sequence health, current state, and irregularities.
        </p>

        <div className="flex items-center gap-2">
          <label className="text-sm text-[#666]">Document type:</label>
          <select
            value={docType}
            onChange={(e) => onDocTypeChange(e.target.value as SequenceDocumentType)}
            className="block w-32 rounded-xl border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
          >
            <option value="INVOICE">Invoice</option>
            <option value="VOUCHER">Voucher</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading !== null}
            onClick={async () => {
              onSetLoading("health");
              onSetHealthReport(null);
              onError(null);
              try {
                const report = await runSequenceHealthCheck(orgId, docType);
                onSetHealthReport(report);
              } catch (err) {
                onError(err instanceof Error ? err.message : "Health check failed");
              } finally {
                onSetLoading(null);
              }
            }}
          >
            {loading === "health" ? "Running…" : "Run health check"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={loading !== null}
            onClick={async () => {
              onSetLoading("overview");
              onSetSupportOverview(null);
              onSetDiagResult(null);
              onError(null);
              try {
                const overview = await getSupportOverview(orgId, docType);
                onSetSupportOverview(overview);
              } catch (err) {
                onError(err instanceof Error ? err.message : "Support overview failed");
              } finally {
                onSetLoading(null);
              }
            }}
          >
            {loading === "overview" ? "Loading…" : "Support overview"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={loading !== null}
            onClick={async () => {
              onSetLoading("diagnostics");
              onSetDiagResult(null);
              onError(null);
              try {
                const now = new Date();
                const start = new Date(now.getFullYear() - 2, 0, 1);
                const result = await diagnoseSequenceHealth({
                  orgId,
                  documentType: docType,
                  startDate: start,
                  endDate: now,
                });
                onSetDiagResult(result.summary);
              } catch (err) {
                onError(err instanceof Error ? err.message : "Diagnostics failed");
              } finally {
                onSetLoading(null);
              }
            }}
          >
            {loading === "diagnostics" ? "Running…" : "Run diagnostics"}
          </Button>
        </div>

        {/* Health Check Results */}
        {healthReport && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-[#1a1a1a]">Health check</h4>
              <Badge variant={healthReport.passed ? "success" : "warning"}>
                {healthReport.passed ? "Passed" : "Failed"}
              </Badge>
            </div>
            {healthReport.failures.length === 0 ? (
              <p className="text-sm text-green-700">All checks passed.</p>
            ) : (
              <div className="space-y-2">
                {healthReport.failures.map((f: HealthCheckFailure, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_COLORS[f.severity] ?? "bg-gray-100 border-gray-200"}`}
                  >
                    <span className="font-medium capitalize">{f.severity}</span>: {f.message}
                    {f.count !== undefined && (
                      <span className="ml-2 text-xs opacity-70">({f.count})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Support Overview */}
        {supportOverview && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[#1a1a1a]">Support overview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#666]">Sequence</p>
                <p className="font-medium text-[#1a1a1a]">{supportOverview.name}</p>
              </div>
              <div>
                <p className="text-[#666]">Status</p>
                <Badge variant={supportOverview.isActive ? "success" : "warning"}>
                  {supportOverview.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-[#666]">Next preview</p>
                <p className="font-medium text-[#1a1a1a]">{supportOverview.nextPreview ?? "—"}</p>
              </div>
              <div>
                <p className="text-[#666]">Finalized docs</p>
                <p className="font-medium text-[#1a1a1a]">{supportOverview.totalFinalizedDocs}</p>
              </div>
              <div>
                <p className="text-[#666]">Periods</p>
                <p className="font-medium text-[#1a1a1a]">
                  {supportOverview.periodCount} ({supportOverview.openPeriodCount} open, {supportOverview.closedPeriodCount} closed)
                </p>
              </div>
              <div>
                <p className="text-[#666]">Resequence</p>
                <p className="font-medium text-[#1a1a1a]">
                  {supportOverview.resequenceCount > 0
                    ? `${supportOverview.resequenceCount} times (last: ${supportOverview.lastResequenceAt?.slice(0, 10) ?? "—"})`
                    : "Never"}
                </p>
              </div>
            </div>
            {supportOverview.periods.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-[#666] mb-2">Recent periods</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e5e5]">
                      <th className="text-left py-1 px-2 text-[#666] font-medium">Period</th>
                      <th className="text-left py-1 px-2 text-[#666] font-medium">Status</th>
                      <th className="text-left py-1 px-2 text-[#666] font-medium">Counter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportOverview.periods.slice(0, 10).map((p) => (
                      <tr key={p.periodId} className="border-b border-[#f5f5f5]">
                        <td className="py-1 px-2 text-[#1a1a1a]">
                          {p.startDate} – {p.endDate}
                        </td>
                        <td className="py-1 px-2">
                          <Badge variant={p.status === "OPEN" ? "success" : "default"}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-1 px-2 text-[#1a1a1a]">{p.currentCounter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Diagnostics Result */}
        {diagResult && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[#1a1a1a]">Gap &amp; irregularity diagnostics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[#666]">Total docs</p>
                <p className="font-bold text-[#1a1a1a] text-lg">{diagResult.irregularities + diagResult.warnings}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-[#666]">Gaps</p>
                <p className="font-bold text-yellow-700 text-lg">{diagResult.gaps}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-[#666]">Warnings</p>
                <p className="font-bold text-orange-700 text-lg">{diagResult.warnings}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-[#666]">Criticals</p>
                <p className="font-bold text-red-700 text-lg">{diagResult.criticals}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  "sequence.created": "Created",
  "sequence.edited": "Edited",
  "sequence.periodicity_changed": "Periodicity changed",
  "sequence.future_activated": "Future format activated",
  "sequence.continuity_seeded": "Continuity seeded",
  "sequence.resequence_previewed": "Resequence previewed",
  "sequence.resequence_confirmed": "Resequence confirmed",
  "sequence.locked_attempt_blocked": "Locked period blocked",
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
        <CardTitle className="text-base">Sequence history</CardTitle>
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
            variant="secondary"
            size="sm"
          >
            {loading ? "Loading…" : "Load history"}
          </Button>
        </div>
        {loading && <p className="text-sm text-[#666]">Loading history…</p>}
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
                      <Badge variant="default">
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
