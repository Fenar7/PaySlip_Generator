"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPartnerReports } from "../actions";

interface Activity {
  id: string;
  action: string;
  clientOrgId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date | string;
}

interface PartnerMetrics {
  managedClientCount: number;
  activeAssignmentCount: number;
  recentActivityCount: number;
  recentActivity: Activity[];
}

export default function PartnerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getPartnerReports();
      if (result.success && result.data) {
        setMetrics(result.data as PartnerMetrics);
      } else if (!result.success) {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error ?? "No partner profile found. Apply to become a partner first."}
          </p>
        </div>
        <Link href="/app/partner">
          <Button className="mt-4" variant="secondary" size="sm">
            ← Partner Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your activity, managed clients, and performance metrics.
          </p>
        </div>
        <Link href="/app/partner">
          <Button variant="secondary" size="sm">
            ← Dashboard
          </Button>
        </Link>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="mt-3 text-xs font-medium text-gray-500">Total Managed Clients</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {metrics.managedClientCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="mt-3 text-xs font-medium text-gray-500">Active Assignments</p>
            <p className="mt-1 text-3xl font-bold text-green-700">
              {metrics.activeAssignmentCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="mt-3 text-xs font-medium text-gray-500">
              Actions (Last 30 Days)
            </p>
            <p className="mt-1 text-3xl font-bold text-blue-700">
              {metrics.recentActivityCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          {metrics.recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No recent activity logged.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 font-medium text-gray-500">Action</th>
                    <th className="pb-2 font-medium text-gray-500">Client Org</th>
                    <th className="pb-2 font-medium text-gray-500">Entity</th>
                    <th className="pb-2 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentActivity.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="py-2.5 font-mono text-xs text-gray-700">
                        {a.action}
                      </td>
                      <td className="py-2.5 text-xs text-gray-500">
                        {a.clientOrgId ? a.clientOrgId.slice(0, 12) + "…" : "—"}
                      </td>
                      <td className="py-2.5 text-xs text-gray-500">
                        {a.entityType ?? "—"}
                        {a.entityId ? ` / ${a.entityId.slice(0, 8)}…` : ""}
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {new Date(a.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3 py-2">
            <Link href="/app/partner/clients">
              <Button variant="secondary" size="sm">
                Manage Clients
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
