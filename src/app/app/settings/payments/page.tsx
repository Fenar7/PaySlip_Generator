"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveRazorpayConfig,
  getRazorpayConfig,
  testRazorpayConnection,
  deleteRazorpayConfig,
  type RazorpayConfigView,
} from "./actions";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Connected" : "Not connected"}
    </span>
  );
}

export default function PaymentSettingsPage() {
  const [config, setConfig] = useState<RazorpayConfigView | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"test" | "live">("test");
  const [formKeyId, setFormKeyId] = useState("");
  const [formKeySecret, setFormKeySecret] = useState("");
  const [formWebhookSecret, setFormWebhookSecret] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadConfig() {
    setLoading(true);
    const result = await getRazorpayConfig();
    if (result.success) setConfig(result.data);
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEdit() {
    if (config) {
      setFormKeyId(config.keyId);
      setFormMode(config.mode);
      setFormKeySecret("");
      setFormWebhookSecret("");
    }
    setShowForm(true);
    setTestResult(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveRazorpayConfig({
        keyId: formKeyId.trim(),
        keySecret: formKeySecret.trim(),
        webhookSecret: formWebhookSecret.trim(),
        mode: formMode,
      });
      if (result.success) {
        setShowForm(false);
        setTestResult(null);
        await loadConfig();
      } else {
        setTestResult({ ok: false, message: result.error });
      }
    });
  }

  function handleTest() {
    startTransition(async () => {
      const result = await testRazorpayConnection();
      setTestResult(
        result.success
          ? { ok: true, message: `Connected. Account ID: ${result.data.accountId}` }
          : { ok: false, message: result.error }
      );
    });
  }

  function handleDisconnect() {
    if (!confirm("Disconnect Razorpay? Existing payment links will remain valid but new ones cannot be created.")) return;
    startTransition(async () => {
      await deleteRazorpayConfig();
      setConfig(null);
      setShowForm(false);
    });
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}/api/webhooks/razorpay`
      : "/api/webhooks/razorpay";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Payment Gateway</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect Razorpay to accept online payments, generate payment links, and reconcile transactions automatically.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2D81F7]/10">
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
                <rect width="32" height="32" rx="4" fill="#2D81F7" />
                <text x="4" y="22" fontSize="14" fontWeight="700" fill="white">R</text>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Razorpay</p>
              <p className="text-xs text-slate-400">Payment Gateway</p>
            </div>
          </div>
          {!loading && <StatusBadge active={config?.isActive ?? false} />}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : config ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Key ID</p>
                  <p className="mt-0.5 font-mono text-slate-700">{config.keyId}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Mode</p>
                  <p className="mt-0.5 capitalize text-slate-700">{config.mode}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Key Secret</p>
                  <p className="mt-0.5 font-mono text-slate-400">{config.keySecretMasked}</p>
                </div>
                {config.lastSyncAt && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Last Synced</p>
                    <p className="mt-0.5 text-slate-500">
                      {new Date(config.lastSyncAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" onClick={handleEdit} disabled={isPending}>
                  Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={handleTest} disabled={isPending}>
                  Test Connection
                </Button>
                <Button size="sm" variant="danger" onClick={handleDisconnect} disabled={isPending}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                No payment gateway connected. Connect Razorpay to start accepting online payments.
              </p>
              <Button size="sm" onClick={() => setShowForm(true)} disabled={isPending}>
                Connect Razorpay
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium text-slate-900">
              {config ? "Update Razorpay Credentials" : "Connect Razorpay"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                <div className="flex gap-3">
                  {(["test", "live"] as const).map((m) => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="razorpay-mode"
                        value={m}
                        checked={formMode === m}
                        onChange={() => setFormMode(m)}
                        className="text-blue-600"
                      />
                      <span className="text-sm capitalize text-slate-700">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Key ID</label>
                <Input
                  placeholder="rzp_test_…"
                  value={formKeyId}
                  onChange={(e) => setFormKeyId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Key Secret</label>
                <Input
                  type="password"
                  placeholder="Enter new secret (leave blank to keep existing)"
                  value={formKeySecret}
                  onChange={(e) => setFormKeySecret(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Secret</label>
                <Input
                  type="password"
                  placeholder="From Razorpay Dashboard → Webhooks"
                  value={formWebhookSecret}
                  onChange={(e) => setFormWebhookSecret(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {testResult && (
                <p
                  className={`text-sm ${testResult.ok ? "text-green-600" : "text-red-600"}`}
                >
                  {testResult.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setTestResult(null);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-slate-900">Webhook Endpoint</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-500">
            Add this URL to your{" "}
            <a
              href="https://dashboard.razorpay.com/app/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-slate-700"
            >
              Razorpay Dashboard
            </a>{" "}
            under Webhooks. Enable events:{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              payment_link.paid
            </code>,{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              payment_link.expired
            </code>,{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              virtual_account.credited
            </code>.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <code className="flex-1 text-xs text-slate-700 break-all">{webhookUrl}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
