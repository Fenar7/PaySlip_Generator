"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createOAuthApp,
  listOAuthApps,
  rotateClientSecret,
  deleteOAuthApp,
} from "./actions";
import { VALID_SCOPES } from "@/lib/oauth/utils";

interface OAuthAppItem {
  id: string;
  name: string;
  clientId: string;
  scopes: string[];
  isPublic: boolean;
  createdAt: Date;
}

interface SecretDisplay {
  clientId: string;
  clientSecret: string;
}

export default function OAuthAppsPage() {
  const [apps, setApps] = useState<OAuthAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [secretModal, setSecretModal] = useState<SecretDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formRedirects, setFormRedirects] = useState("");
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function loadApps() {
    setLoading(true);
    const result = await listOAuthApps();
    if (result.success) {
      setApps(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await listOAuthApps();
      if (cancelled) return;
      if (result.success) {
        setApps(result.data);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    const redirectUris = formRedirects
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const result = await createOAuthApp({
      name: formName,
      description: formDescription || undefined,
      websiteUrl: formWebsite || undefined,
      redirectUris,
      scopes: formScopes,
    });

    if (result.success) {
      setSecretModal(result.data);
      setShowCreate(false);
      resetForm();
      loadApps();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  }

  async function handleRotateSecret(appId: string) {
    if (!confirm("Rotate client secret? The current secret will stop working immediately.")) return;
    const result = await rotateClientSecret(appId);
    if (result.success) {
      setSecretModal({ clientId: "", clientSecret: result.data.clientSecret });
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(appId: string) {
    if (!confirm("Delete this OAuth app? All authorizations will be revoked.")) return;
    const result = await deleteOAuthApp(appId);
    if (result.success) {
      loadApps();
    } else {
      setError(result.error);
    }
  }

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormWebsite("");
    setFormRedirects("");
    setFormScopes([]);
  }

  function toggleScope(scope: string) {
    setFormScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OAuth Apps</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage OAuth 2.0 applications for third-party integrations
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create App</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Secret Modal */}
      {secretModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Client Credentials</h2>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              ⚠️ Copy the client secret now — it won&apos;t be shown again.
            </div>
            {secretModal.clientId && (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Client ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono break-all">
                    {secretModal.clientId}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(secretModal.clientId, "clientId")}
                  >
                    {copiedField === "clientId" ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Client Secret</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono break-all">
                  {secretModal.clientSecret}
                </code>
                <Button
                  onClick={() => copyToClipboard(secretModal.clientSecret, "secret")}
                >
                  {copiedField === "secret" ? "Copied!" : "Copy"}
                </Button>
              </div>
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
          <h2 className="text-lg font-semibold text-slate-900">Create OAuth App</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">App Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="My Integration"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website URL</label>
            <input
              type="url"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Redirect URIs * (one per line)
            </label>
            <textarea
              value={formRedirects}
              onChange={(e) => setFormRedirects(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder={"https://example.com/callback\nhttps://example.com/auth/callback"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Scopes *</label>
            <div className="grid grid-cols-2 gap-2">
              {VALID_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-slate-300"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create App"}
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

      {/* Apps List */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">Loading…</div>
      ) : apps.length === 0 ? (
        <div className="text-center text-slate-500 py-12 border border-dashed border-slate-300 rounded-xl">
          No OAuth apps yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{app.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{app.clientId}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Created {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleRotateSecret(app.id)}>
                    Rotate Secret
                  </Button>
                  <Button onClick={() => handleDelete(app.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              {app.scopes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {app.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
