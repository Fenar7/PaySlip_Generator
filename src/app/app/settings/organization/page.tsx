"use client";
import { useState, useEffect } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrgSettings, saveOrgBranding, saveOrgFinancials } from "../actions";

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
      getOrgSettings(activeOrg.id).then(data => {
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
  }

  if (!activeOrg) {
    return (
      <div className="text-sm text-[#666]">
        No active organization. Complete onboarding first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Organization</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Name</label>
              <p className="text-sm bg-[#f8f8f8] border border-[#e5e5e5] rounded-md px-3 py-2 text-[#666]">
                {activeOrg.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Slug</label>
              <p className="text-sm font-mono bg-[#f8f8f8] border border-[#e5e5e5] rounded-md px-3 py-2 text-[#666]">
                {activeOrg.slug}
              </p>
            </div>
            <p className="text-xs text-[#999]">
              Contact support to change organization name or slug.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Brand identity</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBranding} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Accent color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-[#e5e5e5]"
                />
                <span className="text-sm font-mono text-[#666]">{accentColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Font family</label>
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              >
                {["Inter", "Roboto", "Poppins", "Playfair Display"].map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            {success === "branding" && <p className="text-sm text-green-600">✓ Branding saved</p>}
            <Button type="submit" disabled={saving === "branding"}>
              {saving === "branding" ? "Saving…" : "Save branding"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Financial details</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveFinancials} className="space-y-4 max-w-md">
            <Input
              label="Bank name"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
            />
            <Input
              label="Account number"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
            />
            <Input
              label="IFSC code"
              value={bankIFSC}
              onChange={e => setBankIFSC(e.target.value)}
            />
            <Input
              label="Tax ID / PAN"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
            />
            <Input
              label="GSTIN"
              value={gstin}
              onChange={e => setGstin(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Business address
              </label>
              <textarea
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                rows={3}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-none"
              />
            </div>
            {success === "financials" && (
              <p className="text-sm text-green-600">✓ Financial details saved</p>
            )}
            <Button type="submit" disabled={saving === "financials"}>
              {saving === "financials" ? "Saving…" : "Save details"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
