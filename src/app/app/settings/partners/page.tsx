"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getClientOrgPartnerAccess,
  getPendingPartnerAccessRequests,
  reviewPartnerAccessRequest,
  revokeClientPartnerAccess,
} from "@/app/app/partner/actions";

// SEC-02: Empty scope must never display as "Full access".
// Empty scope means no explicit permissions — the access guard denies all operations.
const SCOPE_LABELS: Record<string, string> = {
  view_invoices: "View Invoices",
  manage_documents: "Manage Documents",
  view_payments: "View Payments",
  create_payslips: "Create Payslips",
  view_gst_filings: "View GST Filings",
  manage_gst_filings: "Manage GST Filings",
};

function formatScope(scope: string[]): string {
  if (scope.length === 0) return "No explicit permissions";
  return scope.map((s) => SCOPE_LABELS[s] ?? s).join(", ");
}

interface PartnerAccess {
  managedOrgId: string;
  partnerCode: string;
  companyName: string;
  type: string;
  partnerStatus: string;
  scope: string[];
  addedAt: Date | string;
}

interface PendingRequest {
  requestId: string;
  partnerCode: string;
  companyName: string;
  type: string;
  scope: string[];
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date | string;
}

export default function ClientOrgPartnersPage() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const reload = async () => {
    const [accessRes, requestsRes] = await Promise.all([
      getClientOrgPartnerAccess(),
      getPendingPartnerAccessRequests(),
    ]);

    if (accessRes.success) {
      setPartners(accessRes.data as PartnerAccess[]);
    } else {
      setError("Failed to load partner access.");
    }

    if (requestsRes.success) {
      setPendingRequests(requestsRes.data as PendingRequest[]);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [accessRes, requestsRes] = await Promise.all([
        getClientOrgPartnerAccess(),
        getPendingPartnerAccessRequests(),
      ]);

      if (cancelled) return;

      if (accessRes.success) {
        setPartners(accessRes.data as PartnerAccess[]);
      } else {
        setError("Failed to load partner access.");
      }

      if (requestsRes.success) {
        setPendingRequests(requestsRes.data as PendingRequest[]);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRevoke(managedOrgId: string, companyName: string) {
    if (
      !confirm(
        `Remove ${companyName}'s access to your organization? This takes effect immediately.`
      )
    )
      return;

    setActionLoading(managedOrgId);
    const res = await revokeClientPartnerAccess(managedOrgId);
    if (!res.success) {
      setError(res.error);
    } else {
      await reload();
    }
    setActionLoading(null);
  }

  async function handleReview(
    requestId: string,
    decision: "APPROVED" | "REJECTED"
  ) {
    setActionLoading(requestId);
    const res = await reviewPartnerAccessRequest(requestId, decision);
    if (!res.success) {
      setError(res.error);
    } else {
      await reload();
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner Access</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage which partners have access to your organization and review
          incoming access requests.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            className="mt-1 text-xs text-red-600 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending access requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">
              Pending Access Requests ({pendingRequests.length})
            </h2>
            <p className="text-sm text-gray-500">
              Partners are requesting access to your organization. Review and
              approve or reject each request.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-start justify-between rounded-md border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">
                      {req.companyName}
                    </div>
                    <div className="font-mono text-xs text-gray-400">
                      {req.partnerCode} · {req.type}
                    </div>
                    <div className="text-xs text-gray-600">
                      Requesting: {formatScope(req.scope)}
                    </div>
                    {req.notes && (
                      <div className="text-xs text-gray-500">
                        Note: {req.notes}
                      </div>
                    )}
                    {req.expiresAt && (
                      <div className="text-xs text-gray-400">
                        Expires:{" "}
                        {new Date(req.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 pl-4">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading === req.requestId}
                      onClick={() => handleReview(req.requestId, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading === req.requestId}
                      onClick={() => handleReview(req.requestId, "REJECTED")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active partner assignments */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">
            Active Partner Access ({partners.length})
          </h2>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No partners currently have access to your organization.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 font-medium text-gray-500">Partner</th>
                    <th className="pb-2 font-medium text-gray-500">Type</th>
                    <th className="pb-2 font-medium text-gray-500">
                      Permissions
                    </th>
                    <th className="pb-2 font-medium text-gray-500">Since</th>
                    <th className="pb-2 font-medium text-gray-500">Status</th>
                    <th className="pb-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((pa) => (
                    <tr
                      key={pa.managedOrgId}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3">
                        <div className="font-medium text-gray-900">
                          {pa.companyName}
                        </div>
                        <div className="font-mono text-xs text-gray-400">
                          {pa.partnerCode}
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{pa.type}</td>
                      <td className="py-3 text-xs text-gray-500">
                        {formatScope(pa.scope)}
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(pa.addedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        {pa.partnerStatus === "APPROVED" ? (
                          <Badge variant="success">Active</Badge>
                        ) : pa.partnerStatus === "SUSPENDED" ? (
                          <Badge variant="warning">Suspended</Badge>
                        ) : (
                          <Badge variant="danger">
                            {pa.partnerStatus.replace("_", " ")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actionLoading === pa.managedOrgId}
                          onClick={() =>
                            handleRevoke(pa.managedOrgId, pa.companyName)
                          }
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Privacy note:</strong> Partners listed above can access your
          organization&apos;s data within the permissions shown. You can revoke
          access at any time — changes take effect immediately.
        </p>
      </div>
    </div>
  );
}
