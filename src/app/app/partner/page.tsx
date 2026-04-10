"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPartnerDashboard } from "./actions";

interface PartnerProfile {
  companyName: string;
  status: string;
  type: string;
  revenueShare: number;
  partnerCode: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export default function PartnerPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<{
    profile: PartnerProfile;
    managedOrgCount: number;
    managedOrgs: Record<string, unknown>[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getPartnerDashboard();
      if (result.success) {
        setDashboard(result.data as unknown as { profile: PartnerProfile; managedOrgCount: number; managedOrgs: Record<string, unknown>[] });
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

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Become a Partner
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Join our partner program to manage client organizations, earn
                revenue share, and grow your practice.
              </p>
              <Link href="/app/partner/apply">
                <Button className="mt-6">Apply Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, managedOrgCount } = dashboard;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your partner profile and client organizations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {profile.companyName}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[profile.status] ?? "bg-gray-100 text-gray-800"}`}
            >
              {profile.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Type</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {profile.type}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Managed Clients</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {managedOrgCount}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Revenue Share</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {Number(profile.revenueShare)}%
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Partner Code</p>
              <p className="mt-1 text-sm font-mono font-semibold text-gray-900">
                {profile.partnerCode}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.status === "PENDING" && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ⏳ Your partner application is under review. You&apos;ll be notified
            once it&apos;s approved.
          </p>
        </div>
      )}

      {profile.status === "APPROVED" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/app/partner/clients">
                <Button>Manage Clients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {profile.status === "SUSPENDED" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            🚫 Your partner account has been suspended. Please contact support
            for more information.
          </p>
        </div>
      )}
    </div>
  );
}
