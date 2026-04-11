"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPartnerDashboard, inviteClientOrg, removeClientOrg } from "../actions";

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
  const [adding, setAdding] = useState(false);
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

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgId.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    const result = await inviteClientOrg(newOrgId.trim());
    if (result.success) {
      setSuccess("Client added successfully");
      setNewOrgId("");
      const refreshed = await getPartnerDashboard();
      if (refreshed.success) setClients(refreshed.data.managedOrgs as unknown as ManagedClient[]);
    } else {
      setError(result.error);
    }
    setAdding(false);
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
          <h2 className="text-lg font-semibold text-gray-900">Add Client</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddClient} className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Organization ID"
                placeholder="Enter client organization ID"
                value={newOrgId}
                onChange={(e) => setNewOrgId(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={adding || !newOrgId.trim()}>
              {adding ? "Adding…" : "Add Client"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-2 text-sm text-green-600">✓ {success}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Clients ({clients.length})
          </h2>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No managed clients yet. Add your first client above.
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
                          <Link href={`/app/partner/clients/${client.org?.id ?? client.orgId}/invoices`}>
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
                            {removing === (client.org?.id ?? client.orgId) ? "Removing…" : "Remove"}
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
