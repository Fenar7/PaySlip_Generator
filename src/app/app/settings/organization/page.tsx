"use client";
import { useState, useEffect } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { Input } from "@/components/ui/input";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardContent,
  SettingsSectionHeader,
  SettingsFormField,
  SettingsSaveBar,
  SettingsReadOnlyField,
} from "@/components/settings/settings-primitives";
import { getOrgSettings, saveOrgBranding, saveOrgFinancials } from "../actions";
import { Palette, Building2, Landmark } from "lucide-react";

export default function OrganizationSettingsPage() {
  const { activeOrg } = useActiveOrg();
  const [accentColor, setAccentColor] = useState("#dc2626");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIFSC, setBankIFSC] = useState("");
  const [taxId, setTaxId] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (activeOrg?.id) {
      getOrgSettings(activeOrg.id).then((data) => {
        if (data?.branding) {
          setAccentColor(data.branding.accentColor);
          setFontFamily(data.branding.fontFamily);
        }
        if (data?.defaults) {
          setBankName(data.defaults.bankName ?? "");
          setBankAccount(data.defaults.bankAccount ?? "");
          setBankIFSC(data.defaults.bankIFSC ?? "");
          setTaxId(data.defaults.taxId ?? "");
          setGstin(data.defaults.gstin ?? "");
          setBusinessAddress(data.defaults.businessAddress ?? "");
        }
      });
    }
  }, [activeOrg?.id]);

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg?.id) return;
    setSaving("branding");
    setSuccess(null);
    await saveOrgBranding({ organizationId: activeOrg.id, accentColor, fontFamily });
    setSaving(null);
    setSuccess("branding");
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleSaveFinancials(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg?.id) return;
    setSaving("financials");
    setSuccess(null);
    await saveOrgFinancials({
      organizationId: activeOrg.id,
      bankName,
      bankAccount,
      bankIFSC,
      taxId,
      gstin,
      businessAddress,
    });
    setSaving(null);
    setSuccess("financials");
    setTimeout(() => setSuccess(null), 3000);
  }

  if (!activeOrg) {
    return (
      <div className="slipwise-panel p-6">
        <p className="text-sm text-[var(--text-muted)]">
          No active organization. Complete onboarding first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Identity */}
      <SettingsCard>
        <SettingsCardHeader>
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
            <SettingsSectionHeader
              title="Organization Identity"
              description="Core organization details. Contact support to change name or slug."
            />
          </div>
        </SettingsCardHeader>
        <SettingsCardContent>
          <div className="grid gap-5 sm:grid-cols-2 max-w-2xl">
            <SettingsReadOnlyField
              label="Organization Name"
              value={activeOrg.name}
            />
            <SettingsReadOnlyField
              label="Slug"
              value={<span className="font-mono text-xs">{activeOrg.slug}</span>}
            />
          </div>
        </SettingsCardContent>
      </SettingsCard>

      {/* Brand Identity */}
      <SettingsCard>
        <SettingsCardHeader>
          <div className="flex items-center gap-2.5">
            <Palette className="h-4 w-4 text-[var(--brand-primary)]" />
            <SettingsSectionHeader
              title="Brand Identity"
              description="Customize how Slipwise looks for your organization."
            />
          </div>
        </SettingsCardHeader>
        <SettingsCardContent>
          <form onSubmit={handleSaveBranding} className="space-y-5 max-w-xl">
            <SettingsFormField
              label="Accent color"
              hint="Used for buttons, links, and highlights across your workspace."
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--border-soft)] bg-white p-0.5"
                />
                <span className="font-mono text-sm text-[var(--text-secondary)]">{accentColor}</span>
              </div>
            </SettingsFormField>

            <SettingsFormField label="Font family">
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                {["Inter", "Roboto", "Poppins", "Playfair Display"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </SettingsFormField>

            <SettingsSaveBar
              saving={saving === "branding"}
              saved={success === "branding"}
              saveLabel="Save branding"
            />
          </form>
        </SettingsCardContent>
      </SettingsCard>

      {/* Financial Details */}
      <SettingsCard>
        <SettingsCardHeader>
          <div className="flex items-center gap-2.5">
            <Landmark className="h-4 w-4 text-[var(--brand-primary)]" />
            <SettingsSectionHeader
              title="Financial Details"
              description="Banking and tax information used on documents and reports."
            />
          </div>
        </SettingsCardHeader>
        <SettingsCardContent>
          <form onSubmit={handleSaveFinancials} className="space-y-5 max-w-xl">
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsFormField label="Bank name">
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                />
              </SettingsFormField>
              <SettingsFormField label="IFSC code">
                <Input
                  value={bankIFSC}
                  onChange={(e) => setBankIFSC(e.target.value)}
                  placeholder="e.g. HDFC0001234"
                />
              </SettingsFormField>
            </div>

            <SettingsFormField label="Account number">
              <Input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Enter account number"
              />
            </SettingsFormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsFormField label="Tax ID / PAN">
                <Input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Enter tax ID"
                />
              </SettingsFormField>
              <SettingsFormField label="GSTIN">
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="Enter GSTIN"
                />
              </SettingsFormField>
            </div>

            <SettingsFormField label="Business address">
              <textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
                placeholder="Enter registered business address"
              />
            </SettingsFormField>

            <SettingsSaveBar
              saving={saving === "financials"}
              saved={success === "financials"}
              saveLabel="Save details"
            />
          </form>
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
