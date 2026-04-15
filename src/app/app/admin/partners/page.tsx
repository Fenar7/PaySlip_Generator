"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminListPartners, adminGetPartnerOverview } from "./actions";
import { PartnerStatus } from "@/generated/prisma/client";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
};

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

type PartnerRow = {
  id: string;
  companyName: string;
  type: string;
  status: PartnerStatus;
  partnerCode: string;
  managedOrgCount: number;
  createdAt: Date;
  orgId: string;
};

type Overview = {
  byStatus: Partial<Record<PartnerStatus, number>>;
  totalPartners: number;
  recentApplications: PartnerRow[];
};

export default function AdminPartnersPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [filter, setFilter] = useState<PartnerStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [overviewRes, listRes] = await Promise.all([
        adminGetPartnerOverview(),
        adminListPartners(),
      ]);
      if (!overviewRes.success) {
        setError(overviewRes.error);
      } else {
        setOverview(overviewRes.data as Overview);
      }
      if (listRes.success) {
        setPartners(listRes.data as PartnerRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleFilterChange(status: PartnerStatus | "ALL") {
    setFilter(status);
    setLoading(true);
    const res = await adminListPartners(
      status === "ALL" ? undefined : { status }
    );
    if (res.success) setPartners(res.data as PartnerRow[]);
    setLoading(false);
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner Governance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Approve, review, suspend, and revoke partner applications.
        </p>
      </div>

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(["PENDING", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "REVOKED"] as PartnerStatus[]).map(
            (status) => (
              <Card key={status} className="cursor-pointer hover:bg-gray-50" onClick={() => handleFilterChange(status)}>
                <CardContent>
                  <p className="mt-3 text-xs font-medium text-gray-500">
                    {STATUS_LABELS[status]}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {overview.byStatus[status] ?? 0}
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "ALL" ? "primary" : "secondary"}
          onClick={() => handleFilterChange("ALL")}
        >
          All ({overview?.totalPartners ?? 0})
        </Button>
        {(["PENDING", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "REVOKED"] as PartnerStatus[]).map(
          (status) => (
            <Button
              key={status}
              size="sm"
              variant={filter === status ? "primary" : "secondary"}
              onClick={() => handleFilterChange(status)}
            >
              {STATUS_LABELS[status]}
            </Button>
          )
        )}
      </div>

      {/* Partner list */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Partners ({loading ? "…" : partners.length})
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-sm text-gray-500">Loading…</p>
          ) : partners.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No partners found for this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 font-medium text-gray-500">Company</th>
                    <th className="pb-2 font-medium text-gray-500">Type</th>
                    <th className="pb-2 font-medium text-gray-500">Status</th>
                    <th className="pb-2 font-medium text-gray-500">Clients</th>
                    <th className="pb-2 font-medium text-gray-500">Applied</th>
                    <th className="pb-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => (
                    <tr key={partner.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">
                          {partner.companyName}
                        </div>
                        <div className="font-mono text-xs text-gray-400">
                          {partner.partnerCode}
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{partner.type}</td>
                      <td className="py-3">
                        <Badge variant={STATUS_BADGE[partner.status]}>
                          {STATUS_LABELS[partner.status]}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-600">
                        {partner.managedOrgCount}
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(partner.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <Link href={`/app/admin/partners/${partner.id}`}>
                          <Button variant="ghost" size="sm">
                            Review →
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
