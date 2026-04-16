"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getActivePortalSessions,
  revokeCustomerPortalAccess,
  revokeAllPortalTokens,
} from "../actions";

type Session = {
  id: string;
  jti: string;
  issuedAt: string | Date;
  expiresAt: string | Date;
  lastSeenAt: string | Date | null;
  ip: string | null;
  customer: { id: string; name: string; email: string };
};

export default function PortalAccessPage() {
  const { activeOrg } = useActiveOrg();
  const { role } = usePermissions();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = role === "admin" || role === "owner";

  const loadSessions = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const data = await getActivePortalSessions(activeOrg.id);
      setSessions(data as Session[]);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (!activeOrg) {
    return <div className="text-sm text-[#666]">No active organization.</div>;
  }

  if (!isAdmin) {
    return <div className="text-sm text-red-600">Admin access required.</div>;
  }

  async function handleRevokeCustomer(customerId: string) {
    if (!activeOrg?.id) return;
    if (!confirm("Revoke all portal access for this customer? They will need to request a new magic link.")) return;
    setRevoking(customerId);
    setMessage(null);
    try {
      const result = await revokeCustomerPortalAccess(activeOrg.id, customerId);
      setMessage({
        type: "success",
        text: `Revoked ${result.revokedSessions} session(s) and ${result.revokedTokens} token(s) for this customer.`,
      });
      await loadSessions();
    } catch {
      setMessage({ type: "error", text: "Failed to revoke access. Please try again." });
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeAll() {
    if (!activeOrg?.id) return;
    if (!confirm("This will revoke ALL active portal sessions and tokens. All customers will be signed out. Continue?")) return;
    setRevokingAll(true);
    setMessage(null);
    try {
      const result = await revokeAllPortalTokens(activeOrg.id);
      setMessage({
        type: "success",
        text: `Revoked ${result.revokedSessions ?? 0} session(s) and ${result.revokedTokens ?? 0} token(s) across all customers.`,
      });
      await loadSessions();
    } catch {
      setMessage({ type: "error", text: "Failed to revoke all access. Please try again." });
    } finally {
      setRevokingAll(false);
    }
  }

  function formatDate(d: string | Date | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }

  // Group sessions by customer for cleaner display
  const byCustomer = sessions.reduce<Record<string, { customer: Session["customer"]; sessions: Session[] }>>(
    (acc, s) => {
      if (!acc[s.customer.id]) {
        acc[s.customer.id] = { customer: s.customer, sessions: [] };
      }
      acc[s.customer.id].sessions.push(s);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Active Portal Sessions</h1>
          <p className="mt-1 text-sm text-[#666]">
            View and revoke active customer portal sessions. Revocation takes effect on the next request.
          </p>
        </div>
        <Button
          type="button"
          variant="danger"
          onClick={handleRevokeAll}
          disabled={revokingAll || sessions.length === 0}
        >
          {revokingAll ? "Revoking…" : "Revoke All"}
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-[#1a1a1a]">
              {loading ? "Loading…" : `${sessions.length} active session${sessions.length !== 1 ? "s" : ""}`}
            </span>
            <button
              onClick={loadSessions}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[#666]">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[#666] py-4 text-center">No active portal sessions.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.values(byCustomer).map(({ customer, sessions: customerSessions }) => (
                <div key={customer.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1a1a1a] truncate">{customer.name}</p>
                      <p className="text-xs text-[#666] truncate">{customer.email}</p>
                      <div className="mt-2 space-y-1">
                        {customerSessions.map((s) => (
                          <div key={s.id} className="flex items-center gap-3 text-xs text-[#666]">
                            <span>Issued {formatDate(s.issuedAt)}</span>
                            <span className="text-slate-300">·</span>
                            <span>Expires {formatDate(s.expiresAt)}</span>
                            {s.lastSeenAt && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span>Last seen {formatDate(s.lastSeenAt)}</span>
                              </>
                            )}
                            {s.ip && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono">{s.ip}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleRevokeCustomer(customer.id)}
                      disabled={revoking === customer.id}
                      className="shrink-0 text-xs"
                    >
                      {revoking === customer.id ? "Revoking…" : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
