"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPartnerDashboard,
  requestClientAccess,
  removeClientOrg,
} from "../actions";

const AVAILABLE_SCOPES = [
  { value: "view_invoices", label: "View Invoices" },
  { value: "manage_documents", label: "Manage Documents" },
  { value: "view_payments", label: "View Payments" },
  { value: "create_payslips", label: "Create Payslips" },
  { value: "view_gst_filings", label: "View GST Filings" },
  { value: "manage_gst_filings", label: "Manage GST Filings" },
];

interface ManagedClient {
  id: string;
  orgId: string;
  addedAt: string;
  org?: { id: string; name: string; slug: string };
}

export default function PartnerClientsPage() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [newOrgId, setNewOrgId] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["view_invoices"]);
  const [requesting, setRequesting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getPartnerDashboard();
      if (result.success) {
        setClients(result.data.managedOrgs as unknown as ManagedClient[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgId.trim()) return;
    if (selectedScopes.length === 0) {
      setError("Select at least one permission scope.");
      return;
    }
    setRequesting(true);
    setError(null);
    setSuccess(null);

    const result = await requestClientAccess(newOrgId.trim(), selectedScopes);
    if (result.success) {
      setSuccess(
        "Access request sent — the client org admin must approve before access is granted.",
      );
      setNewOrgId("");
      setSelectedScopes(["view_invoices"]);
    } else {
      setError(result.error);
    }
    setRequesting(false);
  }

  async function handleRemove(orgId: string) {
    if (!confirm("Remove this client organization?")) return;
    setRemoving(orgId);
    setError(null);
    setSuccess(null);

    const result = await removeClientOrg(orgId);
    if (result.success) {
      setClients((prev) => prev.filter((c) => c.org?.id !== orgId && c.orgId !== orgId));
      setSuccess("Client removed");
    } else {
      setError(result.error);
    }
    setRemoving(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Managed Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organizations you manage as a partner.
          </p>
        </div>
        <Link href="/app/partner">
          <Button variant="secondary" size="sm">
            ← Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Request Client Access</h2>
          <p className="text-sm text-gray-500">
            Enter the client&apos;s organization ID and choose the permissions you need.
            The request must be approved by the client&apos;s admin before access is granted.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestAccess} className="space-y-4">
            <Input
              label="Client Organization ID"
              placeholder="Enter client organization ID"
              value={newOrgId}
              onChange={(e) => setNewOrgId(e.target.value)}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Permissions to request
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              disabled={requesting || !newOrgId.trim() || selectedScopes.length === 0}
            >
              {requesting ? "Sending Request…" : "Send Access Request"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-2 text-sm text-green-600">✓ {success}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Active Clients ({clients.length})
          </h2>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No managed clients yet. Send an access request above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 font-medium text-gray-500">Name</th>
                    <th className="pb-2 font-medium text-gray-500">Slug</th>
                    <th className="pb-2 font-medium text-gray-500">Added</th>
                    <th className="pb-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 font-medium text-gray-900">
                        {client.org?.name ?? "—"}
                      </td>
                      <td className="py-3 font-mono text-gray-500">
                        {client.org?.slug ?? "—"}
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(client.addedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/app/partner/clients/${client.org?.id ?? client.orgId}/invoices`}
                          >
                            <Button variant="ghost" size="sm">
                              View Invoices
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={removing === (client.org?.id ?? client.orgId)}
                            onClick={() => handleRemove(client.org?.id ?? client.orgId)}
                          >
                            {removing === (client.org?.id ?? client.orgId)
                              ? "Removing…"
                              : "Remove"}
                          </Button>
                        </div>
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

