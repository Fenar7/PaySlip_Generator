"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveOrg } from "@/hooks/use-active-org";

interface IntegrationStatus {
  provider: string;
  isActive: boolean;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  externalOrgId: string | null;
  connectionStatus: string;
  lastSyncAttemptAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  syncedCount: number | null;
  attemptedCount: number | null;
}

export default function IntegrationsPage() {
  const { activeOrg } = useActiveOrg();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIntegrations() {
      if (!activeOrg) {
        setIntegrations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/integrations/status", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as IntegrationStatus[];
        if (!cancelled) {
          setIntegrations(data);
        }
      } catch {
        if (!cancelled) {
          setIntegrations([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadIntegrations();

    return () => {
      cancelled = true;
    };
  }, [activeOrg]);

  function getStatus(provider: string): IntegrationStatus | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  async function handleSync(provider: string) {
    setSyncing(provider);
    try {
      await fetch(`/api/integrations/${provider}/sync`, { method: "POST" });
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        setIntegrations((await res.json()) as IntegrationStatus[]);
      }
    } finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect(provider: string) {
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "DELETE",
      });
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        setIntegrations((await res.json()) as IntegrationStatus[]);
      }
    } catch {
      // Disconnect failed
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  }

  function formatSyncSummary(status: IntegrationStatus | undefined): string {
    if (!status?.lastSyncStatus) {
      return "No sync attempts recorded yet.";
    }

    const countSummary =
      status.attemptedCount != null && status.syncedCount != null
        ? ` (${status.syncedCount}/${status.attemptedCount} invoices synced)`
        : "";

    return `${status.lastSyncStatus.replaceAll("_", " ")}${countSummary}`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Integrations</h1>
        <p className="text-[#666]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Integrations</h1>
        <p className="text-sm text-[#666] mt-1">
          Connect your accounting software to sync invoices automatically.
        </p>
      </div>

      {/* Tally Prime */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">
                Tally Prime
              </h2>
              <p className="text-sm text-[#666] mt-1">
                Import/export invoices and vouchers with Tally ERP 9 / Prime.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Import &amp; Export
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <a href="/app/settings/integrations/tally">
            <Button variant="secondary" size="sm">
              Open Tally Hub
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Zapier */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Zapier</h2>
              <p className="text-sm text-[#666] mt-1">
                Connect Slipwise to 6,000+ apps via Zapier polling triggers.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
              API Key
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-[#666]">
            Use your API key at{" "}
            <code className="rounded bg-[#f5f5f5] px-1 py-0.5 text-xs">
              GET /api/v1/zapier/triggers/&#123;triggerName&#125;
            </code>{" "}
            as polling triggers. Supported: <span className="font-mono text-xs">invoice.created</span>,{" "}
            <span className="font-mono text-xs">invoice.status_changed</span>,{" "}
            <span className="font-mono text-xs">payment.received</span>,{" "}
            <span className="font-mono text-xs">customer.created</span>.
          </p>
          <a href="/app/settings/developer/tokens">
            <Button variant="secondary" size="sm">
              Manage API Keys
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Make.com */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">
                Make.com (Integromat)
              </h2>
              <p className="text-sm text-[#666] mt-1">
                Receive instant webhook events in Make.com scenarios.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              Webhook
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-[#666]">
            Register a Make.com webhook URL under{" "}
            <strong>Webhook Endpoints</strong>. Slipwise will fire real-time
            events to your scenario on every matching action.
          </p>
          <a href="/app/settings/developer/webhooks/v2">
            <Button variant="secondary" size="sm">
              Configure Webhooks
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* QuickBooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">
                QuickBooks
              </h2>
              <p className="text-sm text-[#666] mt-1">
                Sync invoices with QuickBooks Online.
              </p>
            </div>
            {getStatus("quickbooks")?.isActive && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Connected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {getStatus("quickbooks")?.isActive ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSync("quickbooks")}
                  disabled={syncing === "quickbooks"}
                >
                  {syncing === "quickbooks" ? "Syncing…" : "Sync now"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDisconnect("quickbooks")}
                >
                  Disconnect
                </Button>
                <span className="text-xs text-[#999]">
                  Last sync:{" "}
                  {formatDate(getStatus("quickbooks")?.lastSyncAt ?? null)}
                </span>
              </>
            ) : (
              <a href="/api/integrations/quickbooks/connect">
                <Button variant="primary" size="sm">
                  Connect QuickBooks
                </Button>
              </a>
            )}
          </div>
          {getStatus("quickbooks")?.isActive && (
            <div className="mt-3 space-y-1 text-xs text-[#666]">
              <p>Status: {formatSyncSummary(getStatus("quickbooks"))}</p>
              <p>Token expiry: {formatDate(getStatus("quickbooks")?.tokenExpiresAt ?? null)}</p>
              <p>Company ID: {getStatus("quickbooks")?.externalOrgId ?? "Pending callback"}</p>
              {getStatus("quickbooks")?.lastSyncError && (
                <p className="text-red-600">
                  Last sync issue: {getStatus("quickbooks")?.lastSyncError}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zoho Books */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">
                Zoho Books
              </h2>
              <p className="text-sm text-[#666] mt-1">
                Sync invoices with Zoho Books.
              </p>
            </div>
            {getStatus("zoho")?.isActive && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Connected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {getStatus("zoho")?.isActive ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSync("zoho")}
                  disabled={syncing === "zoho"}
                >
                  {syncing === "zoho" ? "Syncing…" : "Sync now"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDisconnect("zoho")}
                >
                  Disconnect
                </Button>
                <span className="text-xs text-[#999]">
                  Last sync:{" "}
                  {formatDate(getStatus("zoho")?.lastSyncAt ?? null)}
                </span>
              </>
            ) : (
              <a href="/api/integrations/zoho/connect">
                <Button variant="primary" size="sm">
                  Connect Zoho Books
                </Button>
              </a>
            )}
          </div>
          {getStatus("zoho")?.isActive && (
            <div className="mt-3 space-y-1 text-xs text-[#666]">
              <p>Status: {formatSyncSummary(getStatus("zoho"))}</p>
              <p>Token expiry: {formatDate(getStatus("zoho")?.tokenExpiresAt ?? null)}</p>
              <p>Organization ID: {getStatus("zoho")?.externalOrgId ?? "Pending callback"}</p>
              {getStatus("zoho")?.lastSyncError && (
                <p className="text-red-600">
                  Last sync issue: {getStatus("zoho")?.lastSyncError}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
