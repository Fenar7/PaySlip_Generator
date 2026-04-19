"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeGate } from "@/components/plan/upgrade-gate";
import {
  AlertTriangle,
  Copy,
  KeyRound,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";

type SsoProvider = "okta" | "azure" | "google" | "saml_custom" | "oidc_custom";
type SsoProtocol = "SAML" | "OIDC";

interface SsoConfigData {
  protocol: SsoProtocol;
  provider: SsoProvider;
  metadataUrl: string | null;
  metadataXml: string | null;
  acsUrl: string;
  entityId: string;
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  idpSsoBinding: string | null;
  metadataStatus: "PENDING" | "VALID" | "FAILED" | "STALE";
  metadataError: string | null;
  metadataLastFetchedAt: string | null;
  metadataNextRefreshAt: string | null;
  ssoEnforced: boolean;
  isActive: boolean;
  testedAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  lastLoginAt: string | null;
  lastLoginEmail: string | null;
  certificateCount: number;
  // OIDC fields
  oidcIssuerUrl: string | null;
  oidcClientId: string | null;
  oidcScopes: string[];
  oidcEmailDomains: string[];
}

const PROVIDERS: { value: SsoProvider; label: string; protocol: SsoProtocol }[] = [
  { value: "okta", label: "Okta", protocol: "SAML" },
  { value: "azure", label: "Azure AD", protocol: "SAML" },
  { value: "google", label: "Google Workspace", protocol: "OIDC" },
  { value: "saml_custom", label: "Custom SAML", protocol: "SAML" },
  { value: "oidc_custom", label: "Custom OIDC", protocol: "OIDC" },
];

const FAILURE_LABELS: Record<string, string> = {
  invalid_signature: "Invalid signature",
  invalid_audience: "Invalid audience",
  invalid_issuer: "Invalid issuer",
  assertion_expired: "Assertion expired",
  invalid_destination: "Invalid ACS destination",
  invalid_request_state: "Expired or reused request",
  assertion_replay: "Assertion replay detected",
  identity_mapping_failed: "Identity mapping failed",
  metadata_invalid: "Metadata validation failed",
  missing_response: "Missing SAML response",
  sso_required: "Password login blocked by SSO enforcement",
  login_failed: "SSO login failed",
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function SsoSettingsPage() {
  const searchParams = useSearchParams();
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [orgId, setOrgId] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [issuingBreakGlass, setIssuingBreakGlass] = useState(false);
  const [config, setConfig] = useState<SsoConfigData | null>(null);
  const [activeBreakGlassCount, setActiveBreakGlassCount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revealedBreakGlassCode, setRevealedBreakGlassCode] = useState("");

  const [provider, setProvider] = useState<SsoProvider>("okta");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [metadataXml, setMetadataXml] = useState("");
  const [ssoEnforced, setSsoEnforced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const orgRes = await fetch("/api/org/list");
        if (!orgRes.ok) {
          return;
        }

        const orgData = await orgRes.json();
        if (!orgData.activeOrgId) {
          return;
        }

        if (cancelled) return;
        setOrgId(orgData.activeOrgId);

        const active = orgData.orgs?.find(
          (item: { orgId: string; slug: string }) =>
            item.orgId === orgData.activeOrgId,
        );
        if (active && !cancelled) {
          setOrgSlug(active.slug);
        }

        const res = await fetch(`/api/settings/sso?orgId=${orgData.activeOrgId}`);
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        setConfig(data.config);
        setActiveBreakGlassCount(data.activeBreakGlassCount ?? 0);

        if (data.config) {
          setProvider(data.config.provider);
          setMetadataUrl(data.config.metadataUrl ?? "");
          setMetadataXml(data.config.metadataXml ?? "");
          setSsoEnforced(data.config.ssoEnforced);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load SSO settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("tested") === "1") {
      setSuccess("SSO test completed successfully.");
    }

    const errorCode = searchParams.get("sso_error");
    if (errorCode) {
      setError(FAILURE_LABELS[errorCode] ?? "SSO flow failed.");
    }
  }, [searchParams]);

  async function reloadConfig() {
    const res = await fetch(`/api/settings/sso?orgId=${orgId}`);
    if (!res.ok) {
      throw new Error("Failed to reload SSO settings.");
    }

    const data = await res.json();
    setConfig(data.config);
    setActiveBreakGlassCount(data.activeBreakGlassCount ?? 0);

    if (data.config) {
      setProvider(data.config.provider);
      setMetadataUrl(data.config.metadataUrl ?? "");
      setMetadataXml(data.config.metadataXml ?? "");
      setSsoEnforced(data.config.ssoEnforced);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    setRevealedBreakGlassCode("");

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

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save SSO settings.");
        return;
      }

      setConfig(data.config);
      setActiveBreakGlassCount(data.activeBreakGlassCount ?? 0);
      setSuccess(
        data.config?.testedAt
          ? "SSO configuration saved."
          : "SSO configuration saved. Run a successful test before enabling enforcement.",
      );
    } catch {
      setError("Failed to save SSO settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshMetadata() {
    setError("");
    setSuccess("");
    setRefreshing(true);

    try {
      const res = await fetch("/api/settings/sso/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to refresh metadata.");
        return;
      }

      await reloadConfig();
      setSuccess("SSO metadata refreshed.");
    } catch {
      setError("Failed to refresh metadata.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete the SSO configuration for this organization?")) return;

    setError("");
    setSuccess("");
    setRevealedBreakGlassCode("");

    try {
      const res = await fetch(`/api/settings/sso?orgId=${orgId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "" }));
        setError(data.error || "Failed to delete SSO settings.");
        return;
      }

      setConfig(null);
      setProvider("okta");
      setMetadataUrl("");
      setMetadataXml("");
      setSsoEnforced(false);
      setActiveBreakGlassCount(0);
      setSuccess("SSO configuration deleted.");
    } catch {
      setError("Failed to delete SSO settings.");
    }
  }

  function handleTest() {
    if (!orgSlug) return;

    const url = new URL(`/api/auth/sso/${orgSlug}/initiate`, window.location.origin);
    url.searchParams.set("mode", "test");
    url.searchParams.set("next", "/app/settings/security/sso");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  async function handleIssueBreakGlass() {
    setError("");
    setSuccess("");
    setIssuingBreakGlass(true);
    setRevealedBreakGlassCode("");

    try {
      const res = await fetch("/api/settings/sso/break-glass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to issue a break-glass code.");
        return;
      }

      setRevealedBreakGlassCode(data.code);
      setActiveBreakGlassCount(1);
      setSuccess("Break-glass code issued. Copy it now; it will not be shown again.");
    } catch {
      setError("Failed to issue a break-glass code.");
    } finally {
      setIssuingBreakGlass(false);
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
  }

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
        <div className="flex flex-wrap items-center gap-3">
          <Shield className="h-5 w-5 text-[#dc2626]" />
          <h2 className="text-lg font-semibold text-[#1a1a1a]">
            SSO / SAML Configuration
          </h2>
          {config?.isActive && <Badge variant="success">Active</Badge>}
          {config?.ssoEnforced && <Badge variant="warning">Enforced</Badge>}
          {config?.metadataStatus && (
            <Badge
              variant={
                config.metadataStatus === "VALID"
                  ? "success"
                  : config.metadataStatus === "FAILED"
                    ? "danger"
                    : "warning"
              }
            >
              Metadata {config.metadataStatus.toLowerCase()}
            </Badge>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600">
            {success}
          </p>
        )}

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Service Provider Details
            </h3>
            <p className="text-xs text-[#666]">
              Share these values with your identity provider administrator.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] p-3">
                <div>
                  <p className="text-xs font-medium text-[#666]">ACS URL</p>
                  <p className="text-sm font-mono text-[#1a1a1a] break-all">
                    {config?.acsUrl ?? "Save the configuration to generate the ACS URL"}
                  </p>
                </div>
                {config?.acsUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(config.acsUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] p-3">
                <div>
                  <p className="text-xs font-medium text-[#666]">Entity ID</p>
                  <p className="text-sm font-mono text-[#1a1a1a] break-all">
                    {config?.entityId ?? "Save the configuration to generate the entity ID"}
                  </p>
                </div>
                {config?.entityId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(config.entityId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {orgSlug && (
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] p-3">
                  <div>
                    <p className="text-xs font-medium text-[#666]">Metadata URL</p>
                    <p className="text-sm font-mono text-[#1a1a1a] break-all">
                      {`${appUrl}/api/auth/sso/${orgSlug}/metadata`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        `${appUrl}/api/auth/sso/${orgSlug}/metadata`,
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
                  {PROVIDERS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Metadata URL"
                value={metadataUrl}
                onChange={(e) => setMetadataUrl(e.target.value)}
                placeholder="https://your-idp.example.com/app/metadata"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-[var(--foreground)]">
                  Metadata XML (optional)
                </label>
                <textarea
                  className="min-h-[160px] w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 font-mono text-sm text-[var(--foreground)]"
                  value={metadataXml}
                  onChange={(e) => setMetadataXml(e.target.value)}
                  placeholder="<md:EntityDescriptor ...>"
                />
              </div>

              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <p className="text-sm font-semibold text-[#1a1a1a]">
                  Parsed IdP runtime
                </p>
                <div className="mt-3 space-y-2 text-sm text-[#1a1a1a]">
                  <p>
                    <span className="font-medium text-[#666]">Entity ID:</span>{" "}
                    {config?.idpEntityId ?? "Not validated yet"}
                  </p>
                  <p>
                    <span className="font-medium text-[#666]">SSO endpoint:</span>{" "}
                    {config?.idpSsoUrl ?? "Not validated yet"}
                  </p>
                  <p>
                    <span className="font-medium text-[#666]">Binding:</span>{" "}
                    {config?.idpSsoBinding ?? "Not validated yet"}
                  </p>
                  <p>
                    <span className="font-medium text-[#666]">Certificates:</span>{" "}
                    {config?.certificateCount ?? 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ssoEnforced}
                      onChange={(e) => setSsoEnforced(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-amber-800">
                      Enforce SSO for this organization
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-amber-700">
                    Enforcement is only accepted after a successful SSO test. Owners can
                    recover with an explicit break-glass code.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Configuration"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTest}
                  disabled={!orgSlug}
                >
                  Test SSO
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRefreshMetadata}
                  disabled={refreshing}
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  {refreshing ? "Refreshing…" : "Refresh Metadata"}
                </Button>
                {config && (
                  <Button type="button" variant="danger" onClick={handleDelete}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[#1a1a1a]">Health & diagnostics</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-[#1a1a1a]">
                <p>
                  <span className="font-medium text-[#666]">Last successful test:</span>{" "}
                  {formatTimestamp(config?.testedAt ?? null)}
                </p>
                <p>
                  <span className="font-medium text-[#666]">Last metadata refresh:</span>{" "}
                  {formatTimestamp(config?.metadataLastFetchedAt ?? null)}
                </p>
                <p>
                  <span className="font-medium text-[#666]">Next metadata refresh:</span>{" "}
                  {formatTimestamp(config?.metadataNextRefreshAt ?? null)}
                </p>
                <p>
                  <span className="font-medium text-[#666]">Last SSO login:</span>{" "}
                  {config?.lastLoginEmail
                    ? `${config.lastLoginEmail} at ${formatTimestamp(config.lastLoginAt)}`
                    : "Never"}
                </p>
                <p>
                  <span className="font-medium text-[#666]">Last failure:</span>{" "}
                  {config?.lastFailureReason
                    ? `${FAILURE_LABELS[config.lastFailureReason] ?? config.lastFailureReason} at ${formatTimestamp(config.lastFailureAt)}`
                    : "None"}
                </p>
                {config?.metadataError && (
                  <p>
                    <span className="font-medium text-[#666]">Metadata error:</span>{" "}
                    {config.metadataError}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#dc2626]" />
                <h3 className="text-sm font-semibold text-[#1a1a1a]">Break-glass recovery</h3>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#666]">
                Owners can issue a one-time emergency code that temporarily bypasses SSO
                enforcement after password sign-in.
              </p>
              <p className="mt-3 text-sm text-[#1a1a1a]">
                Active codes: <span className="font-semibold">{activeBreakGlassCount}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleIssueBreakGlass}
                  disabled={issuingBreakGlass || !config}
                >
                  {issuingBreakGlass ? "Issuing…" : "Issue break-glass code"}
                </Button>
              </div>
              {revealedBreakGlassCode && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700">
                    Copy this code now. It will not be shown again.
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <code className="text-sm font-semibold text-amber-900">
                      {revealedBreakGlassCode}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(revealedBreakGlassCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UpgradeGate>
  );
}
