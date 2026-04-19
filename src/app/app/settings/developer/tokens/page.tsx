"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VALID_SCOPES } from "@/lib/oauth/utils";
import { createToken, listTokens, revokeToken } from "./actions";
import type { ApiKeyListItem } from "./actions";

interface NewKey {
  key: string;
  keyPrefix: string;
  id: string;
}

function StatusBadge({ isActive, revokedAt }: { isActive: boolean; revokedAt: Date | null }) {
  if (!isActive || revokedAt) {
    return <Badge variant="danger">Revoked</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [minExpiryDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );

  // Form state
  const [formName, setFormName] = useState("");
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formExpiry, setFormExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function loadTokens() {
    setLoading(true);
    const result = await listTokens();
    if (result.success) setTokens(result.data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await listTokens();
      if (cancelled) return;
      if (result.success) setTokens(result.data);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    const result = await createToken({
      name: formName,
      scopes: formScopes,
      expiresAt: formExpiry || null,
    });
    if (result.success) {
      setNewKey(result.data);
      setShowCreate(false);
      resetForm();
      loadTokens();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this token? It will stop working immediately.")) return;
    setRevoking(id);
    const result = await revokeToken(id);
    setRevoking(null);
    if (result.success) loadTokens();
    else setError(result.error);
  }

  function resetForm() {
    setFormName("");
    setFormScopes([]);
    setFormExpiry("");
  }

  function toggleScope(scope: string) {
    setFormScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function copyKey(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const active = tokens.filter((t) => t.isActive);
  const revoked = tokens.filter((t) => !t.isActive);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Tokens</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personal Access Tokens for programmatic access to the Slipwise API
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Generate Token</Button>
      </div>

      {/* Auth docs callout */}
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">Authentication</p>
        <p>
          Pass the token in the{" "}
          <code className="bg-blue-100 px-1 rounded font-mono">Authorization: Bearer &lt;token&gt;</code>{" "}
          header, or as{" "}
          <code className="bg-blue-100 px-1 rounded font-mono">X-API-Key: &lt;token&gt;</code>.
        </p>
        <p className="text-blue-700">
          See the{" "}
          <a href="/app/developer/docs" className="underline font-medium">
            API documentation
          </a>{" "}
          for endpoint reference.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* New key reveal modal */}
      {newKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Token Created</h2>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              ⚠️ Copy the token now — it won&apos;t be shown again.
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Token</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono break-all">
                  {newKey.key}
                </code>
                <Button onClick={() => copyKey(newKey.key)}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Generate New Token</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Token Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. CI/CD pipeline, Zapier integration"
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Scopes * <span className="text-slate-400 font-normal">(select at least one)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VALID_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-slate-300"
                  />
                  <code className="text-xs">{scope}</code>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expiry Date{" "}
              <span className="text-slate-400 font-normal">(leave blank for no expiry)</span>
            </label>
            <input
              type="date"
              value={formExpiry}
              onChange={(e) => setFormExpiry(e.target.value)}
              className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={minExpiryDate}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Generating…" : "Generate Token"}
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

      {/* Active tokens */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-700">
          Active Tokens
          {active.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({active.length})
            </span>
          )}
        </h2>
        {loading ? (
          <div className="text-center text-slate-500 py-8">Loading…</div>
        ) : active.length === 0 ? (
          <div className="text-center text-slate-500 py-8 border border-dashed border-slate-300 rounded-xl">
            No active tokens. Generate one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onRevoke={handleRevoke}
                isRevoking={revoking === token.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Revoked tokens */}
      {revoked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-400">
            Revoked Tokens ({revoked.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {revoked.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onRevoke={handleRevoke}
                isRevoking={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TokenRow({
  token,
  onRevoke,
  isRevoking,
}: {
  token: ApiKeyListItem;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 text-sm">{token.name}</span>
            <StatusBadge isActive={token.isActive} revokedAt={token.revokedAt} />
            {token.expiresAt && token.isActive && (
              <span className="text-xs text-slate-500">
                Expires {new Date(token.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono">{token.keyPrefix}…</p>
          {token.lastUsedAt && (
            <p className="text-xs text-slate-400">
              Last used {new Date(token.lastUsedAt).toLocaleString()}
            </p>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {token.scopes.map((scope) => (
              <span
                key={scope}
                className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
        {token.isActive && (
          <Button
            onClick={() => onRevoke(token.id)}
            disabled={isRevoking}
          >
            {isRevoking ? "Revoking…" : "Revoke"}
          </Button>
        )}
      </div>
    </div>
  );
}
