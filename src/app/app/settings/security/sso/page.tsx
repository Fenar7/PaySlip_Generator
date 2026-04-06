"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeGate } from "@/components/plan/upgrade-gate";
import { Shield, Copy, Trash2, AlertTriangle } from "lucide-react";

type SsoProvider = "okta" | "azure" | "google" | "saml_custom";

interface SsoConfigData {
  provider: SsoProvider;
  metadataUrl: string;
  metadataXml: string;
  acsUrl: string;
  entityId: string;
  ssoEnforced: boolean;
  isActive: boolean;
  testedAt: string | null;
}

const PROVIDERS: { value: SsoProvider; label: string }[] = [
  { value: "okta", label: "Okta" },
  { value: "azure", label: "Azure AD" },
  { value: "google", label: "Google Workspace" },
  { value: "saml_custom", label: "Custom SAML" },
];

export default function SsoSettingsPage() {
  const [orgId, setOrgId] = useState<string>("");
  const [orgSlug, setOrgSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SsoConfigData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [provider, setProvider] = useState<SsoProvider>("okta");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [metadataXml, setMetadataXml] = useState("");
  const [ssoEnforced, setSsoEnforced] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadConfig = useCallback(async () => {
    try {
      const orgRes = await fetch("/api/org/list");
      if (!orgRes.ok) return;
      const orgData = await orgRes.json();
      if (!orgData.activeOrgId) return;
      setOrgId(orgData.activeOrgId);
      const active = orgData.orgs?.find(
        (o: { orgId: string }) => o.orgId === orgData.activeOrgId
      );
      if (active) setOrgSlug(active.slug);

      const res = await fetch(
        `/api/settings/sso?orgId=${orgData.activeOrgId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setProvider(data.config.provider);
          setMetadataUrl(data.config.metadataUrl ?? "");
          setMetadataXml(data.config.metadataXml ?? "");
          setSsoEnforced(data.config.ssoEnforced);
        }
      }
    } catch {
      // Config may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/settings/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          provider,
          metadataUrl: metadataUrl || undefined,
          metadataXml: metadataXml || undefined,
          ssoEnforced,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save SSO config");
      } else {
        setSuccess("SSO configuration saved successfully");
        await loadConfig();
      }
    } catch {
      setError("Failed to save SSO config");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete SSO configuration?")) return;
    try {
      const res = await fetch(`/api/settings/sso?orgId=${orgId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfig(null);
        setProvider("okta");
        setMetadataUrl("");
        setMetadataXml("");
        setSsoEnforced(false);
        setSuccess("SSO configuration deleted");
      }
    } catch {
      setError("Failed to delete SSO config");
    }
  }

  async function handleTest() {
    if (!orgSlug) return;
    window.open(`/api/auth/sso/${orgSlug}/initiate`, "_blank");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const acsUrl = orgSlug
    ? `${appUrl}/api/auth/sso/${orgSlug}/callback`
    : "";
  const entityId = appUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#666]">
        Loading…
      </div>
    );
  }

  return (
    <UpgradeGate feature="customBranding" orgId={orgId} minimumPlan="enterprise">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[#dc2626]" />
          <h2 className="text-lg font-semibold text-[#1a1a1a]">
            SSO / SAML Configuration
          </h2>
          {config?.isActive && (
            <Badge variant="success">Active</Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Service Provider Details
            </h3>
            <p className="text-xs text-[#666]">
              Provide these to your Identity Provider
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] p-3">
                <div>
                  <p className="text-xs font-medium text-[#666]">ACS URL</p>
                  <p className="text-sm font-mono text-[#1a1a1a] break-all">
                    {acsUrl || "Configure org slug first"}
                  </p>
                </div>
                {acsUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(acsUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] p-3">
                <div>
                  <p className="text-xs font-medium text-[#666]">Entity ID</p>
                  <p className="text-sm font-mono text-[#1a1a1a]">{entityId}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(entityId)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Identity Provider Configuration
            </h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-[var(--foreground)]">
                  Provider
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)]"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as SsoProvider)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Metadata URL (SSO Login URL)"
                value={metadataUrl}
                onChange={(e) => setMetadataUrl(e.target.value)}
                placeholder="https://your-idp.example.com/sso/saml"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-[var(--foreground)]">
                  Metadata XML (optional — paste IdP metadata)
                </label>
                <textarea
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] font-mono min-h-[100px]"
                  value={metadataXml}
                  onChange={(e) => setMetadataXml(e.target.value)}
                  placeholder="<md:EntityDescriptor ...>"
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ssoEnforced}
                      onChange={(e) => setSsoEnforced(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-amber-800">
                      Enforce SSO for all users
                    </span>
                  </label>
                  <p className="text-xs text-amber-600 mt-1">
                    When enforced, users must sign in via SSO. Password login
                    will be disabled for non-owner members.
                  </p>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && (
                <p className="text-sm text-green-600">✓ {success}</p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Configuration"}
                </Button>
                {config && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleTest}
                    >
                      Test SSO
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </UpgradeGate>
  );
}
