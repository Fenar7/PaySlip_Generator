"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeGate } from "@/components/plan/upgrade-gate";
import {
  Globe,
  Plus,
  Trash2,
  Mail,
  Palette,
} from "lucide-react";

interface DomainData {
  domain: string;
  verified: boolean;
  verifyToken: string;
  verifiedAt: string | null;
}

interface WhiteLabelData {
  removeBranding: boolean;
  emailFromName: string;
  emailReplyTo: string;
}

interface EmailDomainRow {
  id: string;
  emailDomain: string;
  defaultRole: string;
  autoJoin: boolean;
}

export default function EnterpriseSettingsPage() {
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Domain state
  const [domain, setDomain] = useState<DomainData | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  // White label state
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelData>({
    removeBranding: false,
    emailFromName: "",
    emailReplyTo: "",
  });

  // Email domains state
  const [emailDomains, setEmailDomains] = useState<EmailDomainRow[]>([]);
  const [newEmailDomain, setNewEmailDomain] = useState("");
  const [newDefaultRole, setNewDefaultRole] = useState("viewer");
  const [newAutoJoin, setNewAutoJoin] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const orgRes = await fetch("/api/org/list");
      if (!orgRes.ok) return;
      const orgData = await orgRes.json();
      if (!orgData.activeOrgId) return;
      setOrgId(orgData.activeOrgId);

      const res = await fetch(
        `/api/settings/enterprise?orgId=${orgData.activeOrgId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.domain) setDomain(data.domain);
        if (data.whiteLabel) setWhiteLabel(data.whiteLabel);
        if (data.emailDomains) setEmailDomains(data.emailDomains);
      }
    } catch {
      // Data may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  // --- Custom Domain ---
  async function handleSetupDomain(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    try {
      const res = await fetch("/api/settings/enterprise/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, domain: domainInput }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to setup domain");
      } else {
        setSuccess("Domain configured. Add the TXT record to verify.");
        await loadData();
      }
    } catch {
      setError("Failed to setup domain");
    }
  }

  async function handleVerifyDomain() {
    clearMessages();
    setVerifying(true);
    try {
      const res = await fetch("/api/settings/enterprise/domain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const d = await res.json();
      if (d.verified) {
        setSuccess("Domain verified successfully!");
        await loadData();
      } else {
        setError(d.error ?? "Domain verification failed. Check your DNS TXT record.");
      }
    } catch {
      setError("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleRemoveDomain() {
    if (!confirm("Remove custom domain?")) return;
    clearMessages();
    try {
      await fetch(`/api/settings/enterprise/domain?orgId=${orgId}`, {
        method: "DELETE",
      });
      setDomain(null);
      setDomainInput("");
      setSuccess("Domain removed");
    } catch {
      setError("Failed to remove domain");
    }
  }

  // --- White Label ---
  async function handleSaveWhiteLabel(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    try {
      const res = await fetch("/api/settings/enterprise/white-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...whiteLabel }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save white label settings");
      } else {
        setSuccess("White label settings saved");
      }
    } catch {
      setError("Failed to save white label settings");
    }
  }

  // --- Email Domains ---
  async function handleAddEmailDomain(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    try {
      const res = await fetch("/api/settings/enterprise/email-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          emailDomain: newEmailDomain,
          defaultRole: newDefaultRole,
          autoJoin: newAutoJoin,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add email domain");
      } else {
        setNewEmailDomain("");
        setNewDefaultRole("viewer");
        setNewAutoJoin(false);
        await loadData();
        setSuccess("Email domain added");
      }
    } catch {
      setError("Failed to add email domain");
    }
  }

  async function handleRemoveEmailDomain(emailDomain: string) {
    clearMessages();
    try {
      await fetch("/api/settings/enterprise/email-domain", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, emailDomain }),
      });
      await loadData();
    } catch {
      setError("Failed to remove email domain");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#666]">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-[#1a1a1a]">
        Enterprise Settings
      </h2>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600">
          ✓ {success}
        </p>
      )}

      {/* Custom Domain */}
      <UpgradeGate
        feature="customBranding"
        orgId={orgId}
        minimumPlan="enterprise"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#dc2626]" />
              <h3 className="text-sm font-semibold text-[#1a1a1a]">
                Custom Domain
              </h3>
              {domain && (
                <Badge variant={domain.verified ? "success" : "warning"}>
                  {domain.verified ? "Verified" : "Pending"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {domain ? (
              <div className="space-y-3">
                <p className="text-sm text-[#1a1a1a]">
                  Domain: <strong>{domain.domain}</strong>
                </p>
                {!domain.verified && (
                  <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                    <p className="text-xs font-medium text-[#666]">
                      Add this DNS TXT record to verify:
                    </p>
                    <code className="text-xs font-mono text-[#1a1a1a] break-all">
                      {domain.verifyToken}
                    </code>
                  </div>
                )}
                <div className="flex gap-2">
                  {!domain.verified && (
                    <Button
                      size="sm"
                      onClick={handleVerifyDomain}
                      disabled={verifying}
                    >
                      {verifying ? "Verifying…" : "Verify Domain"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleRemoveDomain}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSetupDomain}
                className="flex gap-2 items-end"
              >
                <div className="flex-1">
                  <Input
                    label="Domain"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="app.yourcompany.com"
                    required
                  />
                </div>
                <Button type="submit">Setup Domain</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </UpgradeGate>

      {/* White Label */}
      <UpgradeGate
        feature="customBranding"
        orgId={orgId}
        minimumPlan="enterprise"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#dc2626]" />
              <h3 className="text-sm font-semibold text-[#1a1a1a]">
                White Label
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveWhiteLabel} className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whiteLabel.removeBranding}
                  onChange={(e) =>
                    setWhiteLabel((prev) => ({
                      ...prev,
                      removeBranding: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-[#1a1a1a]">
                  Remove Slipwise branding
                </span>
              </label>

              <Input
                label="Email &ldquo;From&rdquo; Name"
                value={whiteLabel.emailFromName}
                onChange={(e) =>
                  setWhiteLabel((prev) => ({
                    ...prev,
                    emailFromName: e.target.value,
                  }))
                }
                placeholder="Your Company Name"
              />

              <Input
                label="Email Reply-To Address"
                type="email"
                value={whiteLabel.emailReplyTo}
                onChange={(e) =>
                  setWhiteLabel((prev) => ({
                    ...prev,
                    emailReplyTo: e.target.value,
                  }))
                }
                placeholder="support@yourcompany.com"
              />

              <Button type="submit">Save White Label Settings</Button>
            </form>
          </CardContent>
        </Card>
      </UpgradeGate>

      {/* Email Domains */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#dc2626]" />
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Email Domain Auto-Join
            </h3>
          </div>
          <p className="text-xs text-[#666]">
            Users with matching email domains can automatically join your
            organization
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emailDomains.length > 0 && (
              <div className="divide-y divide-[var(--border-soft)] rounded-lg border border-[var(--border-soft)]">
                {emailDomains.map((ed) => (
                  <div
                    key={ed.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#1a1a1a]">
                        @{ed.emailDomain}
                      </span>
                      <Badge variant="default">{ed.defaultRole}</Badge>
                      {ed.autoJoin ? (
                        <Badge variant="success">Auto-join</Badge>
                      ) : (
                        <Badge variant="warning">Invite only</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleRemoveEmailDomain(ed.emailDomain)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleAddEmailDomain}
              className="rounded-lg border border-dashed border-[var(--border-soft)] p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-[#666]">
                <Plus className="h-4 w-4" />
                Add Email Domain
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Email Domain"
                  value={newEmailDomain}
                  onChange={(e) => setNewEmailDomain(e.target.value)}
                  placeholder="yourcompany.com"
                  required
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.75rem] font-semibold text-[var(--foreground)]">
                    Default Role
                  </label>
                  <select
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)]"
                    value={newDefaultRole}
                    onChange={(e) => setNewDefaultRole(e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2.5">
                    <input
                      type="checkbox"
                      checked={newAutoJoin}
                      onChange={(e) => setNewAutoJoin(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-[#1a1a1a]">Auto-join</span>
                  </label>
                </div>
              </div>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Domain
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
