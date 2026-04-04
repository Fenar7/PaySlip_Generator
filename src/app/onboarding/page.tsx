"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  saveOnboardingBranding,
  saveOnboardingFinancials,
  saveOnboardingTemplates,
} from "./actions";

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [orgName, setOrgName] = useState("");
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

  const slug = slugify(orgName);

  async function handleStep1() {
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authClient.organization.create({ name: orgName.trim(), slug });
      if (result?.error) {
        setError(result.error.message ?? "Could not create organization");
        return;
      }
      const id = result.data?.id ?? "";
      setOrgId(id);
      await authClient.organization.setActive({ organizationId: id });
      setStep(2);
    } catch {
      setError("Could not create organization. Try a different name.");
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
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-[#1a1a1a]">
          Slip<span className="text-[#dc2626]">wise</span>
        </span>
        <span className="ml-1 text-xs font-medium bg-[#dc2626] text-white px-1.5 py-0.5 rounded">
          One
        </span>
      </div>

      {/* Progress bar */}
      {step < 5 && (
        <div className="w-full max-w-[480px] mb-6">
          <div className="flex justify-between text-xs text-[#999] mb-2">
            <span>Step {step} of 4</span>
            <span>{["Org Setup", "Branding", "Financials", "Templates"][step - 1]}</span>
          </div>
          <div className="h-1 bg-[#e5e5e5] rounded-full">
            <div
              className="h-1 bg-[#dc2626] rounded-full transition-all duration-300"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-[480px] bg-white border border-[#e5e5e5] rounded-xl p-8 shadow-sm">
        {/* Step 1 */}
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

        {/* Step 2 */}
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

        {/* Step 3 */}
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
              onClick={handleStep3}
              className="w-full text-sm text-[#999] hover:text-[#666]"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 4 */}
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
                {loading ? "Saving…" : "Finish setup →"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
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
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
              value === opt
                ? "border-[#dc2626] bg-[#fff5f5] text-[#dc2626] font-medium"
                : "border-[#e5e5e5] text-[#666] hover:border-[#999]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
