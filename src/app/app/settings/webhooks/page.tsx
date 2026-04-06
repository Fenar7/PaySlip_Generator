"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  failureCount: number;
  createdAt: string;
  lastDeliveredAt: string | null;
};

type DeliveryItem = {
  id: string;
  eventType: string;
  responseStatus: number | null;
  success: boolean;
  attempt: number;
  durationMs: number | null;
  deliveredAt: string;
};

const ALL_EVENTS = [
  "invoice.created", "invoice.updated", "invoice.deleted", "invoice.sent", "invoice.payment_received",
  "voucher.created", "voucher.updated", "voucher.deleted",
  "salary_slip.created", "salary_slip.updated", "salary_slip.deleted",
  "ping",
];

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewDeliveriesId, setViewDeliveriesId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/app/webhooks");
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data.endpoints ?? []);
      }
    } catch {
      setError("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const handleCreate = async () => {
    if (!newUrl.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/app/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl.trim(),
          events: selectedEvents.length > 0 ? selectedEvents : ["*"],
          description: newDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedSecret(data.secret);
        setNewUrl("");
        setNewDescription("");
        setSelectedEvents([]);
        fetchEndpoints();
      } else {
        setError(data.error ?? "Failed to create webhook");
      }
    } catch {
      setError("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (endpointId: string) => {
    try {
      const res = await fetch("/api/app/webhooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointId }),
      });
      if (res.ok) fetchEndpoints();
    } catch {
      setError("Failed to delete endpoint");
    }
  };

  const handleTest = async (endpointId: string) => {
    setTesting(endpointId);
    try {
      await fetch("/api/app/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointId }),
      });
    } catch {
      setError("Test failed");
    } finally {
      setTesting(null);
    }
  };

  const loadDeliveries = async (endpointId: string) => {
    setViewDeliveriesId(endpointId);
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`/api/app/webhooks/deliveries?endpointId=${endpointId}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries ?? []);
      }
    } catch {
      setError("Failed to load deliveries");
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a1a]">Webhooks</h2>
          <p className="text-sm text-[#666] mt-1">
            Receive real-time event notifications via HTTP callbacks.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowCreate(true);
            setCreatedSecret(null);
          }}
        >
          Add Endpoint
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium">✕</button>
        </div>
      )}

      {/* Secret Display */}
      {createdSecret && (
        <Card>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                🔐 Your webhook signing secret. Copy it now — you won&apos;t see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono break-all">
                  {createdSecret}
                </code>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(createdSecret)}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreate && !createdSecret && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Add Webhook Endpoint</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Endpoint URL</label>
                <Input
                  placeholder="https://example.com/webhooks/slipwise"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
                <p className="text-xs text-[#999] mt-1">Must be HTTPS. No localhost or private IPs.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Description (optional)</label>
                <Input
                  placeholder="e.g., Production webhook handler"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded"
                      />
                      <code className="text-xs">{event}</code>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[#999] mt-1">Leave empty to subscribe to all events (*).</p>
              </div>

              <div className="flex gap-2">
                <Button variant="primary" onClick={handleCreate} disabled={creating || !newUrl.trim()}>
                  {creating ? "Creating..." : "Add Endpoint"}
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endpoints List */}
      <Card>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[#999] py-8 text-center">Loading...</p>
          ) : endpoints.length === 0 ? (
            <p className="text-sm text-[#999] py-8 text-center">
              No webhook endpoints configured.
            </p>
          ) : (
            <div className="space-y-4">
              {endpoints.map((ep) => (
                <div key={ep.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{ep.url}</code>
                        {ep.isActive ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                        {ep.failureCount > 0 && (
                          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                            {ep.failureCount} failures
                          </span>
                        )}
                      </div>
                      {ep.description && <p className="text-sm text-[#666] mt-1">{ep.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ep.events.map((e) => (
                          <span key={e} className="text-xs bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{e}</span>
                        ))}
                      </div>
                      <p className="text-xs text-[#999] mt-2">
                        Last delivery: {ep.lastDeliveredAt ? new Date(ep.lastDeliveredAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(ep.id)}
                        disabled={testing === ep.id}
                      >
                        {testing === ep.id ? "Testing..." : "Test"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDeliveriesId === ep.id ? setViewDeliveriesId(null) : loadDeliveries(ep.id)}
                      >
                        {viewDeliveriesId === ep.id ? "Hide" : "Deliveries"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(ep.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Delivery History */}
                  {viewDeliveriesId === ep.id && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">Recent Deliveries</h4>
                      {loadingDeliveries ? (
                        <p className="text-sm text-[#999]">Loading...</p>
                      ) : deliveries.length === 0 ? (
                        <p className="text-sm text-[#999]">No deliveries yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-left text-[#666]">
                                <th className="pb-1 font-medium">Event</th>
                                <th className="pb-1 font-medium">Status</th>
                                <th className="pb-1 font-medium">Duration</th>
                                <th className="pb-1 font-medium">Attempt</th>
                                <th className="pb-1 font-medium">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deliveries.map((d) => (
                                <tr key={d.id} className="border-b last:border-0">
                                  <td className="py-1.5">{d.eventType}</td>
                                  <td className="py-1.5">
                                    {d.success ? (
                                      <span className="text-green-600">{d.responseStatus ?? "OK"}</span>
                                    ) : (
                                      <span className="text-red-600">{d.responseStatus ?? "Failed"}</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 text-[#666]">{d.durationMs ? `${d.durationMs}ms` : "-"}</td>
                                  <td className="py-1.5 text-[#666]">{d.attempt}</td>
                                  <td className="py-1.5 text-[#666]">{new Date(d.deliveredAt).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
