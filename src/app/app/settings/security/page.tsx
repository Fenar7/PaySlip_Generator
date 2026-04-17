"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser, signOutSupabaseBrowser } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initiate2faSetup, verify2faSetup, disable2fa, get2faStatus } from "./actions";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff } from "lucide-react";

type TwoFaStep = "idle" | "setup" | "verify" | "done";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaEnforced, setTwoFaEnforced] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<TwoFaStep>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  useEffect(() => {
    get2faStatus().then((res) => {
      if (res.success) {
        setTwoFaEnabled(res.data.totpEnabled);
        setTwoFaEnforced(res.data.twoFaEnforcedByOrg);
      }
    });
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message ?? "Could not change password");
      } else {
        setSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOutAll() {
    await signOutSupabaseBrowser();
    router.push("/");
  }

  async function handleEnable2fa() {
    setTwoFaError("");
    setTwoFaBusy(true);
    try {
      const res = await initiate2faSetup();
      if (!res.success) { setTwoFaError(res.error); return; }
      const dataUrl = await QRCode.toDataURL(res.data.uri);
      setQrDataUrl(dataUrl);
      setTwoFaStep("setup");
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    setTwoFaError("");
    setTwoFaBusy(true);
    try {
      const res = await verify2faSetup(totpCode);
      if (!res.success) { setTwoFaError(res.error); return; }
      setRecoveryCodes(res.data.recoveryCodes);
      setTwoFaEnabled(true);
      setTwoFaStep("done");
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function handleDisable2fa(e: React.FormEvent) {
    e.preventDefault();
    setTwoFaError("");
    setTwoFaBusy(true);
    try {
      const res = await disable2fa(disablePassword);
      if (!res.success) { setTwoFaError(res.error); return; }
      setTwoFaEnabled(false);
      setTwoFaStep("idle");
      setDisablePassword("");
    } finally {
      setTwoFaBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Change password</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {success && (
              <p className="text-sm text-green-600">✓ Password changed successfully.</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Two-Factor Authentication ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {twoFaEnabled
              ? <ShieldCheck className="h-4 w-4 text-green-600" />
              : <ShieldOff className="h-4 w-4 text-slate-400" />
            }
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Two-factor authentication</h2>
            {twoFaEnabled && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Enabled
              </span>
            )}
            {twoFaEnforced && !twoFaEnabled && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Required by org
              </span>
            )}
          </div>
          <p className="text-sm text-[#666]">
            Use an authenticator app (Google Authenticator, Authy) to add a second layer of security.
          </p>
        </CardHeader>
        <CardContent>
          {twoFaError && <p className="mb-3 text-sm text-red-600">{twoFaError}</p>}

          {/* ── idle: not enabled ── */}
          {!twoFaEnabled && twoFaStep === "idle" && (
            <Button onClick={handleEnable2fa} disabled={twoFaBusy}>
              {twoFaBusy ? "Loading…" : "Enable 2FA"}
            </Button>
          )}

          {/* ── setup: show QR code ── */}
          {twoFaStep === "setup" && (
            <div className="max-w-sm space-y-4">
              <p className="text-sm text-slate-600">
                Scan this QR code with your authenticator app, then enter the 6-digit code below.
              </p>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="TOTP QR code" className="rounded-lg border p-2" width={200} height={200} />
              )}
              <form onSubmit={handleVerify2fa} className="flex gap-2">
                <Input
                  label="6-digit code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoComplete="one-time-code"
                  className="w-32"
                />
                <Button type="submit" disabled={twoFaBusy || totpCode.length !== 6} className="mt-6">
                  {twoFaBusy ? "Verifying…" : "Verify"}
                </Button>
              </form>
            </div>
          )}

          {/* ── done: show recovery codes ── */}
          {twoFaStep === "done" && recoveryCodes.length > 0 && (
            <div className="max-w-md space-y-3">
              <p className="text-sm font-medium text-green-700">✓ 2FA enabled successfully.</p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-xs font-medium text-amber-800">
                  Save these recovery codes in a secure place. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {recoveryCodes.map((code) => (
                    <code key={code} className="block rounded bg-white px-2 py-1 text-xs font-mono text-slate-800">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <Button variant="secondary" onClick={() => { setTwoFaStep("idle"); setRecoveryCodes([]); }}>
                Done
              </Button>
            </div>
          )}

          {/* ── enabled: allow disable ── */}
          {twoFaEnabled && twoFaStep === "idle" && (
            <form onSubmit={handleDisable2fa} className="max-w-sm space-y-3">
              <p className="text-sm text-slate-500">
                To disable 2FA, confirm your password.
              </p>
              <Input
                label="Current password"
                type="password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button variant="danger" type="submit" disabled={twoFaBusy}>
                {twoFaBusy ? "Disabling…" : "Disable 2FA"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Sessions</h2>
          <p className="text-sm text-[#666]">Sign out of all active sessions on all devices</p>
        </CardHeader>
        <CardContent>
          <Button variant="danger" onClick={handleSignOutAll}>
            Sign out all sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

