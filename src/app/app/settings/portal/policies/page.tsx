"use client";

import { useState, useEffect } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPortalPolicies, updatePortalPolicies } from "../actions";

type Policies = {
  portalMagicLinkExpiryHours: number;
  portalSessionExpiryHours: number;
  portalProofUploadEnabled: boolean;
  portalTicketCreationEnabled: boolean;
  portalStatementEnabled: boolean;
  portalQuoteAcceptanceEnabled: boolean;
};

const DEFAULTS: Policies = {
  portalMagicLinkExpiryHours: 24,
  portalSessionExpiryHours: 24,
  portalProofUploadEnabled: false,
  portalTicketCreationEnabled: true,
  portalStatementEnabled: true,
  portalQuoteAcceptanceEnabled: false,
};

export default function PortalPoliciesPage() {
  const { activeOrg } = useActiveOrg();
  const { role } = usePermissions();
  const [policies, setPolicies] = useState<Policies>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "owner";

  useEffect(() => {
    if (activeOrg?.id) {
      getPortalPolicies(activeOrg.id).then((data) => {
        if (data) setPolicies({ ...DEFAULTS, ...data });
      });
    }
  }, [activeOrg?.id]);

  if (!activeOrg) return <div className="text-sm text-[#666]">No active organization.</div>;
  if (!isAdmin) return <div className="text-sm text-red-600">Admin access required.</div>;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg?.id) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await updatePortalPolicies(activeOrg.id, policies);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policies");
    } finally {
      setSaving(false);
    }
  }

  function setPolicy<K extends keyof Policies>(key: K, value: Policies[K]) {
    setPolicies((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a]">Portal Policies</h1>
        <p className="mt-1 text-sm text-[#666]">
          Configure what customers can do via the portal. Changes take effect immediately.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Session & Link Expiry */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-[#1a1a1a]">Session Settings</h2>
            <p className="text-xs text-[#666]">
              Control how long magic links and portal sessions remain valid.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                  Magic Link Expiry (hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={policies.portalMagicLinkExpiryHours}
                  onChange={(e) => setPolicy("portalMagicLinkExpiryHours", parseInt(e.target.value, 10) || 24)}
                  className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-[#999]">1–168 hours (default: 24)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                  Session Expiry (hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={policies.portalSessionExpiryHours}
                  onChange={(e) => setPolicy("portalSessionExpiryHours", parseInt(e.target.value, 10) || 24)}
                  className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-[#999]">1–720 hours (default: 24)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Capabilities */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-[#1a1a1a]">Customer Capabilities</h2>
            <p className="text-xs text-[#666]">
              Enable or disable specific actions customers can perform in the portal.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                key: "portalTicketCreationEnabled" as const,
                label: "Support Ticket Creation",
                description: "Allow customers to create and reply to support tickets.",
              },
              {
                key: "portalStatementEnabled" as const,
                label: "Statement Generation",
                description: "Allow customers to generate account statements.",
              },
              {
                key: "portalQuoteAcceptanceEnabled" as const,
                label: "Quote Acceptance",
                description: "Allow customers to accept or decline quotes from the portal.",
              },
              {
                key: "portalProofUploadEnabled" as const,
                label: "Payment Proof Upload",
                description: "Allow customers to upload payment proof documents.",
              },
            ].map(({ key, label, description }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={policies[key] as boolean}
                  onChange={(e) => setPolicy(key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#e5e5e5] text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a] group-hover:text-blue-600 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-[#666]">{description}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <p className="text-sm text-green-600">✓ Portal policies saved successfully</p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Policies"}
        </Button>
      </form>
    </div>
  );
}
