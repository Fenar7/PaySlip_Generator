"use client";
import { useState, useEffect } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPortalSettings, updatePortalSettings, revokeAllPortalTokens } from "./actions";

export default function PortalSettingsPage() {
  const { activeOrg } = useActiveOrg();
  const { role } = usePermissions();
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [headerMessage, setHeaderMessage] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = role === "admin" || role === "owner";

  useEffect(() => {
    if (activeOrg?.id) {
      getPortalSettings(activeOrg.id).then((data) => {
        if (data) {
          setPortalEnabled(data.portalEnabled);
          setHeaderMessage(data.portalHeaderMessage ?? "");
          setSupportEmail(data.portalSupportEmail ?? "");
          setSupportPhone(data.portalSupportPhone ?? "");
        }
      });
    }
  }, [activeOrg?.id]);

  if (!activeOrg) {
    return (
      <div className="text-sm text-[#666]">
        No active organization. Complete onboarding first.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-sm text-red-600">
        You need admin or owner access to manage portal settings.
      </div>
    );
  }

  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${activeOrg.slug}`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg?.id) return;
    setSaving(true);
    setSuccess(null);
    await updatePortalSettings({
      organizationId: activeOrg.id,
      portalEnabled,
      portalHeaderMessage: headerMessage,
      portalSupportEmail: supportEmail,
      portalSupportPhone: supportPhone,
    });
    setSaving(false);
    setSuccess("settings");
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevokeAll() {
    if (!activeOrg?.id) return;
    if (!confirm("This will revoke all active portal tokens. Customers will need to request new magic links. Continue?")) return;
    setRevoking(true);
    const result = await revokeAllPortalTokens(activeOrg.id);
    setRevoking(false);
    setSuccess(`revoked-${result.revokedCount}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Customer Portal</h2>
          <p className="text-sm text-[#666]">
            Allow customers to view their invoices and statements via a self-service portal.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <label className="block text-sm font-medium text-[#1a1a1a]">
                Portal Enabled
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={portalEnabled}
                onClick={() => setPortalEnabled(!portalEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  portalEnabled ? "bg-[#dc2626]" : "bg-[#d1d5db]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    portalEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-[#666]">
                {portalEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Header Message
              </label>
              <input
                type="text"
                value={headerMessage}
                onChange={(e) => setHeaderMessage(e.target.value)}
                placeholder="Welcome to our customer portal"
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              />
            </div>

            <Input
              label="Support Email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@yourcompany.com"
            />

            <Input
              label="Support Phone"
              type="tel"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />

            {success === "settings" && (
              <p className="text-sm text-green-600">✓ Portal settings saved</p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Portal URL</h2>
          <p className="text-sm text-[#666]">
            Share this URL with customers so they can access the portal.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 max-w-lg">
            <code className="flex-1 bg-[#f8f8f8] border border-[#e5e5e5] rounded-md px-3 py-2 text-sm font-mono text-[#1a1a1a] truncate">
              {portalUrl}
            </code>
            <Button type="button" onClick={handleCopyUrl} variant="secondary">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Security</h2>
          <p className="text-sm text-[#666]">
            Revoke all active portal tokens. Customers will need to request new magic links.
          </p>
        </CardHeader>
        <CardContent>
          {success?.startsWith("revoked-") && (
            <p className="text-sm text-green-600 mb-3">
              ✓ {success.replace("revoked-", "")} token(s) revoked
            </p>
          )}
          <Button
            type="button"
            variant="danger"
            onClick={handleRevokeAll}
            disabled={revoking}
          >
            {revoking ? "Revoking…" : "Revoke all portal tokens"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
