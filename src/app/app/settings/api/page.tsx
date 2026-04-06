"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  revokedAt: string | null;
};

const ALL_SCOPES = [
  "read:invoices", "write:invoices", "delete:invoices",
  "read:vouchers", "write:vouchers", "delete:vouchers",
  "read:salary-slips", "write:salary-slips", "delete:salary-slips",
  "read:customers", "write:customers",
  "read:employees", "write:employees",
  "read:vendors", "write:vendors",
  "read:reports",
];

const EXPIRY_OPTIONS = [
  { label: "Never", value: "" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "1 year", value: "365" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiryDays, setExpiryDays] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/app/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/app/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: selectedScopes.length > 0 ? selectedScopes : ["*"],
          expiresInDays: expiryDays ? parseInt(expiryDays, 10) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedKey(data.key);
        setNewKeyName("");
        setSelectedScopes([]);
        setExpiryDays("");
        fetchKeys();
      } else {
        setError(data.error ?? "Failed to create key");
      }
    } catch {
      setError("Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      const res = await fetch("/api/app/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      if (res.ok) {
        setRevokeId(null);
        fetchKeys();
      }
    } catch {
      setError("Failed to revoke key");
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a1a]">API Keys</h2>
          <p className="text-sm text-[#666] mt-1">
            Manage API keys for programmatic access to Slipwise.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowCreate(true);
            setCreatedKey(null);
          }}
        >
          Create API Key
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium">
            ✕
          </button>
        </div>
      )}

      {/* Created Key Display */}
      {createdKey && (
        <Card>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                🔑 Your API key has been created. Copy it now — you won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey)}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      {showCreate && !createdKey && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Create New API Key</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                  Key Name
                </label>
                <Input
                  placeholder="e.g., Production Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Scopes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SCOPES.map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="rounded"
                      />
                      <code className="text-xs">{scope}</code>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[#999] mt-1">
                  Leave empty for full access (*).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                  Expiry
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button variant="primary" onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                  {creating ? "Creating..." : "Create Key"}
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <Card>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[#999] py-8 text-center">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-[#999] py-8 text-center">
              No API keys yet. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[#666]">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Key</th>
                    <th className="pb-2 font-medium">Scopes</th>
                    <th className="pb-2 font-medium">Last Used</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{key.name}</td>
                      <td className="py-3">
                        <code className="text-xs bg-[#f5f5f5] px-2 py-1 rounded">
                          {key.keyPrefix}...
                        </code>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                            >
                              {s}
                            </span>
                          ))}
                          {key.scopes.length > 3 && (
                            <span className="text-xs text-[#999]">
                              +{key.scopes.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-[#666]">
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="py-3">
                        {key.isActive ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {key.isActive && (
                          <>
                            {revokeId === key.id ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRevoke(key.id)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRevokeId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevokeId(key.id)}
                              >
                                Revoke
                              </Button>
                            )}
                          </>
                        )}
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
