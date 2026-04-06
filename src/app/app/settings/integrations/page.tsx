"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveOrg } from "@/hooks/use-active-org";

interface IntegrationStatus {
  provider: string;
  isActive: boolean;
  lastSyncAt: string | null;
}

export default function IntegrationsPage() {
  const { activeOrg } = useActiveOrg();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!activeOrg) return;
    try {
      const res = await fetch(
        `/api/integrations/status?orgId=${activeOrg.id}`
      );
      if (res.ok) {
        const data = (await res.json()) as IntegrationStatus[];
        setIntegrations(data);
      }
    } catch {
      // Integration status unavailable
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  function getStatus(provider: string): IntegrationStatus | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  async function handleSync(provider: string) {
    setSyncing(provider);
    try {
      await fetch(`/api/integrations/${provider}/sync`, { method: "POST" });
      await fetchIntegrations();
    } finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect(provider: string) {
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "DELETE",
      });
      await fetchIntegrations();
    } catch {
      // Disconnect failed
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
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
                Export invoices as Tally-compatible XML files for import.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Export
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.open("/api/export/tally", "_blank");
            }}
          >
            Export to Tally XML
          </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
