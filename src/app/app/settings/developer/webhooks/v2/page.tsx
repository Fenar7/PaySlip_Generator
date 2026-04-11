"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { WEBHOOK_EVENTS } from "@/lib/webhook/constants";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  updateWebhookEndpoint,
  rotateSigningSecret,
  deleteWebhookEndpoint,
} from "./actions";

interface EndpointItem {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  requiresSecretRotation: boolean;
  consecutiveFails: number;
  lastDeliveryAt: Date | null;
  lastSuccessAt: Date | null;
  createdAt: Date;
}

export default function WebhooksV2Page() {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [secretModal, setSecretModal] = useState<{ signingSecret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formAutoDisable, setFormAutoDisable] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  async function loadEndpoints() {
    setLoading(true);
    const result = await listWebhookEndpoints();
    if (result.success) {
      setEndpoints(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await listWebhookEndpoints();
      if (cancelled) return;
      if (result.success) {
        setEndpoints(result.data);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    const result = await createWebhookEndpoint({
      url: formUrl,
      events: formEvents,
      autoDisableAt: parseInt(formAutoDisable, 10) || 10,
    });
    if (result.success) {
      setSecretModal({ signingSecret: result.data.signingSecret });
      setShowCreate(false);
      resetForm();
      loadEndpoints();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    const result = await updateWebhookEndpoint(id, { isActive: !currentActive });
    if (result.success) loadEndpoints();
    else setError(result.error);
  }

  async function handleRotateSecret(id: string) {
    if (!confirm("Rotate signing secret? The current secret will stop working.")) return;
    const result = await rotateSigningSecret(id);
    if (result.success) {
      setSecretModal({ signingSecret: result.data.signingSecret });
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this webhook endpoint and all its deliveries?")) return;
    const result = await deleteWebhookEndpoint(id);
    if (result.success) loadEndpoints();
    else setError(result.error);
  }

  function resetForm() {
    setFormUrl("");
    setFormEvents([]);
    setFormAutoDisable("10");
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function copySecret(text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks v2</h1>
          <p className="text-sm text-slate-500 mt-1">
            HMAC-signed webhook endpoints with automatic retries
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Endpoint</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Signature verification</h2>
          <p className="text-sm text-slate-500 mt-1">
            Verify <code className="font-mono">X-Slipwise-Signature</code> against the raw body using HMAC-SHA256 over
            <code className="font-mono"> timestamp + &quot;.&quot; + rawBody </code> and the signing secret shown when the endpoint
            is created or rotated.
          </p>
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <p>1. Read the raw request body and <code className="font-mono">X-Slipwise-Timestamp</code>.</p>
          <p>2. Compute <code className="font-mono">sha256=HMAC(secret, timestamp + &quot;.&quot; + rawBody)</code>.</p>
          <p>3. Compare it to <code className="font-mono">X-Slipwise-Signature</code> and reject stale timestamps or replayed delivery IDs.</p>
        </div>
      </div>

      {/* Secret Modal */}
      {secretModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Signing Secret</h2>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              ⚠️ Copy the signing secret now — it won&apos;t be shown again.
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono break-all">
                {secretModal.signingSecret}
              </code>
              <Button onClick={() => copySecret(secretModal.signingSecret)}>
                {copiedSecret ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button className="w-full" onClick={() => setSecretModal(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Webhook Endpoint</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endpoint URL *</label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/webhooks"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Events *</label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-slate-300"
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Auto-disable after N consecutive failures
            </label>
            <input
              type="number"
              value={formAutoDisable}
              onChange={(e) => setFormAutoDisable(e.target.value)}
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="100"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create Endpoint"}
            </Button>
            <Button
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Endpoints List */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">Loading…</div>
      ) : endpoints.length === 0 ? (
        <div className="text-center text-slate-500 py-12 border border-dashed border-slate-300 rounded-xl">
          No webhook endpoints yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        ep.isActive ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {ep.isActive ? "Active" : "Disabled"}
                    </span>
                    {ep.requiresSecretRotation && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Rotate secret required
                      </span>
                    )}
                    {ep.consecutiveFails > 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {ep.consecutiveFails} consecutive failures
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-mono">{ep.url}</p>
                  {ep.requiresSecretRotation && (
                    <p className="text-xs text-amber-700 mt-1">
                      This endpoint was created on the legacy stack. Rotate the signing secret to resume signed deliveries.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ep.events.map((event) => (
                      <span
                        key={event}
                        className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                  {ep.lastDeliveryAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      Last delivery: {new Date(ep.lastDeliveryAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={`/app/settings/developer/webhooks/${ep.id}/deliveries`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    Deliveries
                  </a>
                  <Button onClick={() => handleToggleActive(ep.id, ep.isActive)}>
                    {ep.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button onClick={() => handleRotateSecret(ep.id)}>
                    {ep.requiresSecretRotation ? "Generate Secret" : "Rotate Secret"}
                  </Button>
                  <Button onClick={() => handleDelete(ep.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
