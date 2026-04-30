"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrg } from "@/app/app/actions/org-actions";
import {
  saveOnboardingBranding,
  saveOnboardingFinancials,
  saveOnboardingTemplates,
  saveOnboardingSequences,
} from "./actions";
import type { SequenceCustomConfig, OnboardingSequenceState } from "./actions";
import type { SequencePeriodicity } from "@/features/sequences/types";
import { validateFormat, tokenize, extractCounterFromFormat } from "@/features/sequences/engine/tokenizer";
import { render, buildRenderContext } from "@/features/sequences/engine/renderer";

const PERIODICITY_LABELS: Record<SequencePeriodicity, string> = {
  NONE: "No reset (continuous)",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  FINANCIAL_YEAR: "Financial Year",
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OnboardingPageClient({
  orgId: initialOrgId,
  orgName: initialOrgName,
  sequenceState,
}: {
  orgId?: string;
  orgName?: string;
  sequenceState?: OnboardingSequenceState;
} = {}) {
  const router = useRouter();
  const isResuming = !!initialOrgId;

  // When resuming, we already have an org — skip to the numbering step.
  const startingStep = isResuming ? 5 : 1;
  const [step, setStep] = useState(startingStep);
  const [orgId, setOrgId] = useState(initialOrgId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [orgName, setOrgName] = useState(initialOrgName ?? "");
  const [industry, setIndustry] = useState("Freelance");

  // Step 2
  const [accentColor, setAccentColor] = useState("#dc2626");
  const [fontFamily, setFontFamily] = useState("Inter");

  // Step 3
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIFSC, setBankIFSC] = useState("");
  const [taxId, setTaxId] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Step 4
  const [invoiceTemplate, setInvoiceTemplate] = useState("minimal");
  const [slipTemplate, setSlipTemplate] = useState("modern-premium");
  const [voucherTemplate, setVoucherTemplate] = useState("minimal-office");

  // Step 5 — Document Numbering
  // Derive initial values from hydrated sequence state for re-entry.
  const hasExistingConfig = !!(sequenceState?.invoice && sequenceState?.voucher);
  const hasPartialConfig =
    (sequenceState?.invoice && !sequenceState?.voucher) ||
    (!sequenceState?.invoice && sequenceState?.voucher);

  // When partial, detect whether the existing side is default or custom
  // so the missing side defaults to the same mode.
  const existingPartialSide = hasPartialConfig
    ? (sequenceState?.invoice ? "INVOICE" : "VOUCHER")
    : null;
  const existingPartialConfig = existingPartialSide
    ? sequenceState?.invoice ?? sequenceState?.voucher
    : null;
  const partialIsDefault =
    existingPartialConfig?.formatString ===
      (existingPartialSide === "INVOICE" ? "INV/{YYYY}/{NNNNN}" : "VCH/{YYYY}/{NNNNN}") &&
    existingPartialConfig?.periodicity === "YEARLY";

  const isDefaultConfig =
    hasExistingConfig &&
    sequenceState?.invoice?.formatString === "INV/{YYYY}/{NNNNN}" &&
    sequenceState?.invoice?.periodicity === "YEARLY" &&
    sequenceState?.voucher?.formatString === "VCH/{YYYY}/{NNNNN}" &&
    sequenceState?.voucher?.periodicity === "YEARLY";

  const [sequenceMode, setSequenceMode] = useState<"defaults" | "custom">(
    // When partial and the existing side is custom, default to custom for missing
    (hasPartialConfig && !partialIsDefault) ? "custom"
    : (hasExistingConfig && !isDefaultConfig) ? "custom"
    : "defaults"
  );
  const [invFormat, setInvFormat] = useState(
    sequenceState?.invoice?.formatString ?? "INV/{YYYY}/{NNNNN}"
  );
  const [invPeriodicity, setInvPeriodicity] = useState<SequencePeriodicity>(
    sequenceState?.invoice?.periodicity ?? "YEARLY"
  );
  const [invLatestUsed, setInvLatestUsed] = useState("");
  const [vchFormat, setVchFormat] = useState(
    sequenceState?.voucher?.formatString ?? "VCH/{YYYY}/{NNNNN}"
  );
  const [vchPeriodicity, setVchPeriodicity] = useState<SequencePeriodicity>(
    sequenceState?.voucher?.periodicity ?? "YEARLY"
  );
  const [vchLatestUsed, setVchLatestUsed] = useState("");

  const slug = slugify(orgName);

  async function handleStep1() {
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const org = await createOrg({
        name: orgName.trim(),
        slug,
      });
      setOrgId(org.id);
      if (typeof window !== "undefined") {
        localStorage.setItem("slipwise_active_org_id", org.id);
      }
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("session expired") || msg.toLowerCase().includes("sign in")) {
        setError("Your session expired. Please sign in again.");
      } else if (msg.includes("Unique") || msg.includes("unique") || msg.includes("slug")) {
        setError("An organization with that name already exists. Try a different name.");
      } else {
        setError("Could not create organization. Please try again.");
      }
      console.error("[createOrg error]", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2() {
    setLoading(true);
    try {
      if (orgId) await saveOnboardingBranding({ organizationId: orgId, accentColor, fontFamily });
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3() {
    setError("");
    setLoading(true);
    try {
      if (orgId)
        await saveOnboardingFinancials({
          organizationId: orgId,
          bankName,
          bankAccount,
          bankIFSC,
          taxId,
          gstin,
          businessAddress,
        });
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Could not save financial details. Please try again.");
      console.error("[saveOnboardingFinancials error]", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSkipStep3() {
    setError("");
    setStep(4);
  }

  async function handleStep4() {
    setLoading(true);
    try {
      if (orgId)
        await saveOnboardingTemplates({
          organizationId: orgId,
          invoiceTemplate,
          slipTemplate,
          voucherTemplate,
        });
      setStep(5);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep5() {
    setError("");
    setLoading(true);
    try {
      if (orgId) {
        if (sequenceMode === "custom") {
          const customConfigs: SequenceCustomConfig[] = [
            {
              documentType: "INVOICE",
              formatString: invFormat,
              periodicity: invPeriodicity,
              latestUsedNumber: invLatestUsed.trim() || undefined,
            },
            {
              documentType: "VOUCHER",
              formatString: vchFormat,
              periodicity: vchPeriodicity,
              latestUsedNumber: vchLatestUsed.trim() || undefined,
            },
          ];
          await saveOnboardingSequences({ organizationId: orgId, customConfigs });
        } else {
          await saveOnboardingSequences({ organizationId: orgId });
        }
      }
      setStep(6);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Could not save document numbering. Please try again.");
      console.error("[saveOnboardingSequences error]", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * When the user already has both sequences configured and re-enters
   * onboarding, confirm the step without recreating (the action is
   * idempotent so re-running is safe, but the UX stays clear).
   */
  async function handleConfirmExisting() {
    setError("");
    setLoading(true);
    try {
      if (orgId) {
        await saveOnboardingSequences({ organizationId: orgId });
      }
      setStep(6);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Could not confirm document numbering. Please try again.");
      console.error("[handleConfirmExisting error]", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-[#1a1a1a]">
          Slip<span className="text-[#dc2626]">wise</span>
        </span>
        <span className="ml-1 text-xs font-medium bg-[#dc2626] text-white px-1.5 py-0.5 rounded">
          One
        </span>
      </div>

      {step < 6 && (
        <div className="w-full max-w-[480px] mb-6">
          <div className="flex justify-between text-xs text-[#999] mb-2">
            <span>Step {step} of 5</span>
            <span>{["Org Setup", "Branding", "Financials", "Templates", "Numbering"][step - 1]}</span>
          </div>
          <div className="h-1 bg-[#e5e5e5] rounded-full">
            <div
              className="h-1 bg-[#dc2626] rounded-full transition-all duration-300"
              style={{ width: `${step * 20}%` }}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-[480px] bg-white border border-[#e5e5e5] rounded-xl p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Set up your organization</h2>
            <p className="text-sm text-[#666]">
              This is how your team and clients will identify you.
            </p>
            <Input
              label="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
            {orgName && (
              <p className="text-xs text-[#999]">
                Slug: <span className="font-mono text-[#1a1a1a]">{slug}</span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              >
                {["Freelance", "Agency", "Startup", "Enterprise", "Other"].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full"
              onClick={handleStep1}
              disabled={loading || !orgName.trim()}
            >
              {loading ? "Creating…" : "Continue →"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Brand identity</h2>
            <p className="text-sm text-[#666]">Customize how your documents look to clients.</p>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Accent color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-[#e5e5e5]"
                />
                <span className="text-sm font-mono text-[#666]">{accentColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Font family</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              >
                {["Inter", "Roboto", "Poppins", "Playfair Display"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="bg-[#f8f8f8] rounded-lg p-3 text-sm text-[#999]">
              🖼 Logo upload — coming in Phase 2
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button className="flex-1" onClick={handleStep2} disabled={loading}>
                {loading ? "Saving…" : "Continue →"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Financial details</h2>
            <p className="text-sm text-[#666]">
              Pre-fill your documents. You can edit or skip these now.
            </p>
            <Input
              label="Bank name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="State Bank of India"
            />
            <Input
              label="Account number"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
            />
            <Input
              label="IFSC code"
              value={bankIFSC}
              onChange={(e) => setBankIFSC(e.target.value)}
            />
            <Input
              label="Tax ID / PAN"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
            <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Business address
              </label>
              <textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                rows={3}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-none"
                placeholder="123 Main St, Mumbai 400001"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button className="flex-1" onClick={handleStep3} disabled={loading}>
                {loading ? "Saving…" : "Continue →"}
              </Button>
            </div>
            <button
              type="button"
              onClick={handleSkipStep3}
              className="w-full text-sm text-[#999] hover:text-[#666]"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Default templates</h2>
            <p className="text-sm text-[#666]">
              Pick the templates your documents will default to.
            </p>
            <TemplateRadio
              label="Invoice template"
              options={["minimal", "professional", "classic"]}
              value={invoiceTemplate}
              onChange={setInvoiceTemplate}
            />
            <TemplateRadio
              label="Salary slip template"
              options={["modern-premium", "classic", "minimal"]}
              value={slipTemplate}
              onChange={setSlipTemplate}
            />
            <TemplateRadio
              label="Voucher template"
              options={["minimal-office", "corporate"]}
              value={voucherTemplate}
              onChange={setVoucherTemplate}
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(3)}>
                ← Back
              </Button>
              <Button className="flex-1" onClick={handleStep4} disabled={loading}>
                {loading ? "Saving…" : "Continue →"}
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Document Numbering</h2>
            <p className="text-sm text-[#666]">
              Configure how invoice and voucher numbers are generated. You can change these later
              in settings.
            </p>

            {hasExistingConfig && !hasPartialConfig && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
                <p className="text-sm font-medium text-blue-700">
                  Numbering already configured
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded border border-blue-100 p-2">
                    <p className="text-xs text-[#999]">Invoice</p>
                    <p className="font-mono text-xs text-[#1a1a1a]">
                      {sequenceState?.invoice?.formatString ?? "—"}
                    </p>
                    <p className="text-xs text-[#999]">{sequenceState?.invoice?.periodicity ?? "—"}</p>
                  </div>
                  <div className="bg-white rounded border border-blue-100 p-2">
                    <p className="text-xs text-[#999]">Voucher</p>
                    <p className="font-mono text-xs text-[#1a1a1a]">
                      {sequenceState?.voucher?.formatString ?? "—"}
                    </p>
                    <p className="text-xs text-[#999]">{sequenceState?.voucher?.periodicity ?? "—"}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  Click Confirm and continue to complete this step. You can change these in Settings later.
                </p>
              </div>
            )}

            {hasPartialConfig && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-3">
                <p className="text-sm text-amber-700">
                  One document type is already configured, the other is missing. The
                  existing configuration is shown below — complete the missing type to
                  finish.
                </p>
                {existingPartialConfig && (
                  <div className="bg-white rounded border border-amber-100 p-2 text-sm">
                    <p className="text-xs text-[#999]">
                      {existingPartialSide} (already configured)
                    </p>
                    <p className="font-mono text-xs text-[#1a1a1a]">
                      {existingPartialConfig.formatString}
                    </p>
                    <p className="text-xs text-[#999]">{existingPartialConfig.periodicity}</p>
                  </div>
                )}
                {!sequenceState?.invoice && (
                  <CustomSequenceSection
                    title="Invoice Numbering"
                    documentType="INVOICE"
                    formatValue={invFormat}
                    onFormatChange={setInvFormat}
                    periodicityValue={invPeriodicity}
                    onPeriodicityChange={setInvPeriodicity}
                    latestUsedValue={invLatestUsed}
                    onLatestUsedChange={setInvLatestUsed}
                  />
                )}
                {!sequenceState?.voucher && (
                  <CustomSequenceSection
                    title="Voucher Numbering"
                    documentType="VOUCHER"
                    formatValue={vchFormat}
                    onFormatChange={setVchFormat}
                    periodicityValue={vchPeriodicity}
                    onPeriodicityChange={setVchPeriodicity}
                    latestUsedValue={vchLatestUsed}
                    onLatestUsedChange={setVchLatestUsed}
                  />
                )}
              </div>
            )}

            {!hasExistingConfig && !hasPartialConfig && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#1a1a1a]">Numbering mode</label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setSequenceMode("defaults")}
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      sequenceMode === "defaults"
                        ? "border-[#dc2626] bg-red-50 text-[#1a1a1a]"
                        : "border-[#e5e5e5] bg-white text-[#666] hover:border-[#dc2626]"
                    }`}
                  >
                    <span className="font-medium">Use default sequencing</span>
                    <span className="block text-xs text-[#999] mt-0.5">
                      Invoice: INV/2026/00001 · Voucher: VCH/2026/00001
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSequenceMode("custom")}
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      sequenceMode === "custom"
                        ? "border-[#dc2626] bg-red-50 text-[#1a1a1a]"
                        : "border-[#e5e5e5] bg-white text-[#666] hover:border-[#dc2626]"
                    }`}
                  >
                    <span className="font-medium">Customize sequencing now</span>
                    <span className="block text-xs text-[#999] mt-0.5">
                      Set your own format and periodicity for invoices and vouchers
                    </span>
                  </button>
                </div>
              </div>
            )}

            {sequenceMode === "defaults" && !hasExistingConfig && !hasPartialConfig && (
              <div className="bg-[#f8f8f8] rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-[#1a1a1a]">Default sequences</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded border border-[#e5e5e5] p-3">
                    <p className="text-[#666]">Invoice format</p>
                    <p className="font-mono text-[#1a1a1a]">INV/&#123;YYYY&#125;/&#123;NNNNN&#125;</p>
                    <p className="text-xs text-[#999] mt-0.5">Resets yearly, starts at 1</p>
                  </div>
                  <div className="bg-white rounded border border-[#e5e5e5] p-3">
                    <p className="text-[#666]">Voucher format</p>
                    <p className="font-mono text-[#1a1a1a]">VCH/&#123;YYYY&#125;/&#123;NNNNN&#125;</p>
                    <p className="text-xs text-[#999] mt-0.5">Resets yearly, starts at 1</p>
                  </div>
                </div>
              </div>
            )}

            {sequenceMode === "custom" && !hasExistingConfig && !hasPartialConfig && (
              <div className="space-y-4">
                <CustomSequenceSection
                  title="Invoice Numbering"
                  documentType="INVOICE"
                  formatValue={invFormat}
                  onFormatChange={setInvFormat}
                  periodicityValue={invPeriodicity}
                  onPeriodicityChange={setInvPeriodicity}
                  latestUsedValue={invLatestUsed}
                  onLatestUsedChange={setInvLatestUsed}
                />
                <div className="border-t border-[#e5e5e5]" />
                <CustomSequenceSection
                  title="Voucher Numbering"
                  documentType="VOUCHER"
                  formatValue={vchFormat}
                  onFormatChange={setVchFormat}
                  periodicityValue={vchPeriodicity}
                  onPeriodicityChange={setVchPeriodicity}
                  latestUsedValue={vchLatestUsed}
                  onLatestUsedChange={setVchLatestUsed}
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              {!isResuming && (
                <Button variant="secondary" className="flex-1" onClick={() => setStep(4)}>
                  ← Back
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={hasExistingConfig ? handleConfirmExisting : handleStep5}
                disabled={loading}
              >
                {loading ? "Saving…" : hasExistingConfig ? "Confirm & continue →" : "Finish setup →"}
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">You&apos;re all set!</h2>
            <p className="text-sm text-[#666]">
              Your workspace is ready. Start creating professional documents.
            </p>
            <ul className="text-sm text-left text-[#444] space-y-2 bg-[#f8f8f8] rounded-lg p-4">
              <li>✅ Organization created</li>
              <li>✅ Brand identity configured</li>
              <li>✅ Financial details saved</li>
              <li>✅ Default templates selected</li>
              <li>✅ Document numbering configured</li>
            </ul>
            <Button className="w-full" onClick={() => router.push("/app/home")}>
              Go to dashboard →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateRadio({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">{label}</label>
      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
              value === opt
                ? "border-[#dc2626] bg-red-50 text-[#1a1a1a]"
                : "border-[#e5e5e5] bg-white text-[#666] hover:border-[#dc2626]"
            }`}
          >
            <span className="font-medium capitalize">{opt.replace(/-/g, " ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomSequenceSection({
  title,
  documentType,
  formatValue,
  onFormatChange,
  periodicityValue,
  onPeriodicityChange,
  latestUsedValue,
  onLatestUsedChange,
}: {
  title: string;
  documentType: string;
  formatValue: string;
  onFormatChange: (v: string) => void;
  periodicityValue: SequencePeriodicity;
  onPeriodicityChange: (v: SequencePeriodicity) => void;
  latestUsedValue: string;
  onLatestUsedChange: (v: string) => void;
}) {
  const formatValidation = useMemo(() => validateFormat(formatValue), [formatValue]);

  const preview = useMemo(() => {
    if (!formatValidation.valid) return null;
    try {
      const tokens = tokenize(formatValue);
      const prefix = documentType === "INVOICE" ? "INV" : "VCH";
      // If a continuity seed is provided, preview the NEXT number after it.
      // Otherwise preview the first number (counter = 1).
      const seedCounter = latestUsedValue.trim()
        ? extractCounterFromFormat(latestUsedValue.trim(), formatValue)
        : null;
      const nextCounter = seedCounter !== null ? seedCounter + 1 : 1;
      const ctx = buildRenderContext(new Date(), prefix, nextCounter);
      return render(tokens, ctx);
    } catch {
      return null;
    }
  }, [formatValue, formatValidation.valid, documentType, latestUsedValue]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#1a1a1a]">{title}</h3>

      <div>
        <label className="block text-sm text-[#666] mb-1">Format string</label>
        <Input
          value={formatValue}
          onChange={(e) => onFormatChange(e.target.value)}
          placeholder={`${documentType === "INVOICE" ? "INV" : "VCH"}/{YYYY}/{NNNNN}`}
        />
        <p className="text-xs text-[#999] mt-1">
          Valid tokens: {"{YYYY}"}, {"{MM}"}, {"{DD}"}, {"{NNNNN}"}, {"{FY}"}
        </p>
      </div>

      {!formatValidation.valid && formatValidation.errors.length > 0 && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {formatValidation.errors.join("; ")}
        </div>
      )}

      {preview && (
        <div className="rounded bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-800 flex items-center gap-2">
          <span className="text-[#666]">Preview:</span>
          <span className="font-mono font-medium">{preview}</span>
        </div>
      )}

      <div>
        <label className="block text-sm text-[#666] mb-1">Periodicity</label>
        <select
          value={periodicityValue}
          onChange={(e) => onPeriodicityChange(e.target.value as SequencePeriodicity)}
          className="block w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-0"
        >
          {Object.entries(PERIODICITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-[#666] mb-1">
          Latest already-used number{" "}
          <span className="text-[#999] font-normal">(optional)</span>
        </label>
        <Input
          value={latestUsedValue}
          onChange={(e) => onLatestUsedChange(e.target.value)}
          placeholder={`e.g. ${documentType === "INVOICE" ? "INV/2026/00042" : "VCH/2026/00042"}`}
        />
        <p className="text-xs text-[#999] mt-1">
          If you&apos;ve already used numbers outside Slipwise, enter the latest used
          number to continue from there. Must match the format above.
        </p>
      </div>
    </div>
  );
}
