"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClientOrgPartnerAccess } from "@/app/app/partner/actions";

const SCOPE_LABELS: Record<string, string> = {
  view_invoices: "View Invoices",
  manage_documents: "Manage Documents",
  view_payments: "View Payments",
  create_payslips: "Create Payslips",
};

function formatScope(scope: string[]): string {
  if (scope.length === 0) return "Full access";
  return scope.map((s) => SCOPE_LABELS[s] ?? s).join(", ");
}

interface PartnerAccess {
  managedOrgId: string;
  partnerCode: string;
  companyName: string;
  type: string;
  scope: string[];
  addedAt: Date | string;
}

export default function ClientOrgPartnersPage() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerAccess[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClientOrgPartnerAccess().then((res) => {
      if (res.success) {
        setPartners(res.data as PartnerAccess[]);
      } else {
        setError("Failed to load partner access.");
      }
      setLoading(false);
    });
  }, []);

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
          Partners with active access to your organization. Review and manage
          their permissions here.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

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
                    <th className="pb-2 font-medium text-gray-500">Scope</th>
                    <th className="pb-2 font-medium text-gray-500">Since</th>
                    <th className="pb-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((pa) => (
                    <tr key={pa.managedOrgId} className="border-b border-gray-100">
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
                        <Badge variant="success">Active</Badge>
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
          organization&apos;s data within the scope shown. To remove partner
          access, ask the partner to remove your organization, or contact
          platform support.
        </p>
      </div>
    </div>
  );
}
