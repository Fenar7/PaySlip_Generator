"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminGetPartnerDetail,
  adminBeginPartnerReview,
  adminApprovePartner,
  adminRejectPartner,
  adminSuspendPartner,
  adminReinstatePartner,
  adminRevokePartner,
  adminRevokePartnerClientAssignment,
} from "../actions";
const STATUS_BADGE: Record<
  string,
  "default" | "success" | "warning" | "danger"
> = {
  PENDING: "default",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  SUSPENDED: "danger",
  REVOKED: "danger",
};

type AdminPartnerDetailResult = Awaited<ReturnType<typeof adminGetPartnerDetail>>;
type PartnerDetail = Extract<AdminPartnerDetailResult, { success: true }>["data"];

export default function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = use(params);
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");

  async function reload() {
    const res = await adminGetPartnerDetail(partnerId);
    if (res.success && res.data) {
      setDetail(res.data as unknown as PartnerDetail);
    } else {
      setError(res.success ? "Partner not found" : res.error);
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  async function handleAction(
    actionFn: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string
  ) {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const res = await actionFn();
    if (res.success) {
      setSuccess(successMsg);
      await reload();
    } else {
      setError(res.error ?? "Unknown error");
    }
    setActionLoading(false);
    setNotesInput("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error ?? "Partner not found"}</p>
        </div>
        <Link href="/app/admin/partners">
          <Button className="mt-4" variant="secondary" size="sm">
            ← Back to Partners
          </Button>
        </Link>
      </div>
    );
  }

  const { profile, managedOrgs, reviewHistory } = detail;
  const status = profile.status;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/admin/partners" className="text-sm text-blue-600 hover:underline">
            ← Back to Partners
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {profile.companyName}
          </h1>
          <p className="text-sm font-mono text-gray-500">{profile.partnerCode}</p>
        </div>
        <Badge variant={STATUS_BADGE[status]}>{status.replace("_", " ")}</Badge>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">✓ {success}</p>
        </div>
      )}

      {/* Profile info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Partner Profile</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.type}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Revenue Share</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.revenueShare}%</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Managed Clients</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.managedOrgCount}</dd>
            </div>
            {profile.website && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-blue-600">
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                </dd>
              </div>
            )}
            {profile.description && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.description}</dd>
              </div>
            )}
            {profile.suspendedAt && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs font-medium text-red-500">Suspended</dt>
                <dd className="mt-1 text-sm text-red-700">
                  {new Date(profile.suspendedAt).toLocaleDateString("en-IN")} —{" "}
                  {profile.suspendedReason}
                </dd>
              </div>
            )}
            {profile.revokedAt && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs font-medium text-red-500">Revoked</dt>
                <dd className="mt-1 text-sm text-red-700">
                  {new Date(profile.revokedAt).toLocaleDateString("en-IN")} —{" "}
                  {profile.revokedReason}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Governance actions */}
      {status !== "REVOKED" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Governance Actions</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Notes / Reason (optional for approval; required for suspend/revoke)
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Enter notes or reason…"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {(status === "PENDING") && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    handleAction(
                      () => adminBeginPartnerReview(partnerId, notesInput || undefined),
                      "Application moved to Under Review"
                    )
                  }
                >
                  Begin Review
                </Button>
              )}
              {(status === "PENDING" || status === "UNDER_REVIEW" || status === "SUSPENDED") && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    handleAction(
                      () => adminApprovePartner(partnerId, notesInput || undefined),
                      "Partner approved"
                    )
                  }
                >
                  Approve
                </Button>
              )}
              {(status === "PENDING" || status === "UNDER_REVIEW") && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    handleAction(
                      () => adminRejectPartner(partnerId, notesInput || undefined),
                      "Partner application rejected"
                    )
                  }
                >
                  Reject
                </Button>
              )}
              {status === "APPROVED" && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={actionLoading || !notesInput.trim()}
                  onClick={() =>
                    handleAction(
                      () => adminSuspendPartner(partnerId, notesInput),
                      "Partner suspended"
                    )
                  }
                >
                  Suspend
                </Button>
              )}
              {status === "SUSPENDED" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    handleAction(
                      () => adminReinstatePartner(partnerId, notesInput || undefined),
                      "Partner reinstated"
                    )
                  }
                >
                  Reinstate
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                disabled={actionLoading || !notesInput.trim()}
                onClick={() => {
                  if (
                    !confirm(
                      "Revoking a partner is permanent. They will lose all managed-client access immediately. Continue?"
                    )
                  )
                    return;
                  handleAction(
                    () => adminRevokePartner(partnerId, notesInput),
                    "Partner revoked"
                  );
                }}
              >
                Revoke (Permanent)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Managed clients */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">
            Managed Clients ({managedOrgs.length})
          </h2>
        </CardHeader>
        <CardContent>
          {managedOrgs.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No managed client assignments.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 font-medium text-gray-500">Org</th>
                    <th className="pb-2 font-medium text-gray-500">Scope</th>
                    <th className="pb-2 font-medium text-gray-500">Added</th>
                    <th className="pb-2 font-medium text-gray-500">Status</th>
                    <th className="pb-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedOrgs.map((mo) => (
                    <tr key={mo.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">
                          {mo.org.name}
                        </div>
                        <div className="font-mono text-xs text-gray-400">
                          {mo.org.slug}
                        </div>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {mo.scope.length > 0 ? mo.scope.join(", ") : "all"}
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(mo.addedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        {mo.revokedAt ? (
                          <Badge variant="danger">Revoked</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {!mo.revokedAt && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => {
                              if (
                                !confirm(
                                  `Remove ${mo.org.name} from this partner's managed clients?`
                                )
                              )
                                return;
                              handleAction(
                                () =>
                                  adminRevokePartnerClientAssignment(mo.id),
                                "Client assignment revoked"
                              );
                            }}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review history */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Review History</h2>
        </CardHeader>
        <CardContent>
          {reviewHistory.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No review events yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reviewHistory.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between rounded-md border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {event.fromStatus} → {event.toStatus}
                    </p>
                    {event.notes && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {event.notes}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      by {event.actorUserId.slice(0, 8)}…
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
