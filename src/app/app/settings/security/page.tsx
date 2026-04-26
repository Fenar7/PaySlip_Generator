"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser, signOutSupabaseBrowser } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initiate2faSetup, verify2faSetup, disable2fa } from "./actions";
import {
  getMfaStatus,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  listPasskeys,
  renamePasskey,
  removePasskey,
} from "./passkey-actions";
import { registerPasskey, browserSupportsWebAuthn } from "@/lib/passkey/client";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff, KeyRound, Fingerprint, Trash2, Pencil } from "lucide-react";

type TwoFaStep = "idle" | "setup" | "verify" | "done";

type PasskeyListItem = {
  id: string;
  credentialId: string;
  deviceName: string | null;
  deviceType: string | null;
  backedUp: boolean;
  transports: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // MFA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [twoFaEnforced, setTwoFaEnforced] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<TwoFaStep>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  // Passkey state
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [webauthnSupported, setWebauthnSupported] = useState(true);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removePassword, setRemovePassword] = useState("");

  useEffect(() => {
    setWebauthnSupported(browserSupportsWebAuthn());
    loadMfaStatus();
  }, []);

  async function loadMfaStatus() {
    const res = await getMfaStatus();
    if (res.success) {
      setTotpEnabled(res.data.totpEnabled);
      setPasskeyEnabled(res.data.passkeyEnabled);
      setPasskeyCount(res.data.passkeyCount);
      setTwoFaEnforced(res.data.twoFaEnforcedByOrg);
    }
    const listRes = await listPasskeys();
    if (listRes.success) {
      setPasskeys(listRes.data);
    }
  }

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
      setTotpEnabled(true);
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
      setTotpEnabled(false);
      setTwoFaStep("idle");
      setDisablePassword("");
    } finally {
      setTwoFaBusy(false);
    }
  }

  // ─── Passkey handlers ──────────────────────────────────────────────────────

  async function handleAddPasskey() {
    setPasskeyError("");
    setPasskeyBusy(true);
    try {
      const beginRes = await beginPasskeyRegistration();
      if (!beginRes.success) {
        setPasskeyError(beginRes.error);
        return;
      }
      const options = beginRes.data.options as unknown as import("@simplewebauthn/browser").PublicKeyCredentialCreationOptionsJSON;
      const response = await registerPasskey(options);
      const finishRes = await finishPasskeyRegistration(
        response,
        `Passkey ${new Date().toLocaleDateString()}`
      );
      if (!finishRes.success) {
        setPasskeyError(finishRes.error);
        return;
      }
      await loadMfaStatus();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Passkey registration failed");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleRenamePasskey(id: string) {
    if (!renameValue.trim()) {
      setRenameId(null);
      return;
    }
    const res = await renamePasskey(id, renameValue.trim());
    if (!res.success) {
      setPasskeyError(res.error);
      return;
    }
    setRenameId(null);
    setRenameValue("");
    await loadMfaStatus();
  }

  async function handleRemovePasskey(id: string) {
    setPasskeyError("");
    if (!removePassword.trim()) {
      setPasskeyError("Enter your current password to remove this passkey.");
      return;
    }
    const res = await removePasskey(id, removePassword.trim());
    if (!res.success) {
      setPasskeyError(res.error);
      return;
    }
    setRemoveId(null);
    setRemovePassword("");
    await loadMfaStatus();
  }

  const anyMfaEnabled = totpEnabled || passkeyEnabled;

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

      {/* ─── Multi-Factor Authentication ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {anyMfaEnabled
              ? <ShieldCheck className="h-4 w-4 text-green-600" />
              : <ShieldOff className="h-4 w-4 text-slate-400" />
            }
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Multi-factor authentication</h2>
            {anyMfaEnabled && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Enabled
              </span>
            )}
            {twoFaEnforced && !anyMfaEnabled && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Required by org
              </span>
            )}
          </div>
          <p className="text-sm text-[#666]">
            Passkeys are the preferred method. Authenticator app remains a fallback. Save recovery codes in a secure place.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {passkeyError && <p className="text-sm text-red-600">{passkeyError}</p>}
          {twoFaError && <p className="text-sm text-red-600">{twoFaError}</p>}

          {/* ── Passkeys ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-[#1a1a1a]">Passkeys</h3>
            </div>
            {webauthnSupported ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleAddPasskey}
                  disabled={passkeyBusy}
                  className="mb-3"
                >
                  {passkeyBusy ? "Loading…" : "Add passkey"}
                </Button>
                {passkeys.length > 0 && (
                  <ul className="space-y-2">
                    {passkeys.map((pk) => (
                      <li
                        key={pk.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          {renameId === pk.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="rounded border border-input bg-background px-2 py-1 text-sm"
                                autoFocus
                                maxLength={100}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRenamePasskey(pk.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setRenameId(null); setRenameValue(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : removeId === pk.id ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-[#1a1a1a]">{pk.deviceName || "Unnamed passkey"}</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="password"
                                  value={removePassword}
                                  onChange={(e) => setRemovePassword(e.target.value)}
                                  placeholder="Current password"
                                  className="rounded border border-input bg-background px-2 py-1 text-sm w-40"
                                  autoFocus
                                  autoComplete="current-password"
                                />
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleRemovePasskey(pk.id)}
                                >
                                  Remove
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setRemoveId(null); setRemovePassword(""); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium text-[#1a1a1a]">{pk.deviceName || "Unnamed passkey"}</p>
                              <p className="text-xs text-[#666]">
                                Added {new Date(pk.createdAt).toLocaleDateString()}
                                {pk.lastUsedAt && ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setRenameId(pk.id); setRenameValue(pk.deviceName || ""); setRemoveId(null); }}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRemoveId(pk.id); setRemovePassword(""); setRenameId(null); }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Your browser does not support passkeys. Use the authenticator app option below.
              </p>
            )}
          </div>

          <div className="border-t border-[var(--border-soft)] pt-4">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-[#1a1a1a]">Authenticator app</h3>
            </div>

            {/* ── idle: not enabled ── */}
            {!totpEnabled && twoFaStep === "idle" && (
              <Button onClick={handleEnable2fa} disabled={twoFaBusy}>
                {twoFaBusy ? "Loading…" : "Enable authenticator app"}
              </Button>
            )}

            {/* ── setup: show QR code ── */}
            {twoFaStep === "setup" && (
              <div className="max-w-sm space-y-4">
                <p className="text-sm text-slate-600">
                  Scan this QR code with your authenticator app, then enter the 6-digit code below.
                </p>
                {qrDataUrl && (
                  <Image
                    src={qrDataUrl}
                    alt="TOTP QR code"
                    className="rounded-lg border p-2"
                    width={200}
                    height={200}
                    unoptimized
                  />
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
                <p className="text-sm font-medium text-green-700">✓ Authenticator app enabled successfully.</p>
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
            {totpEnabled && twoFaStep === "idle" && (
              <form onSubmit={handleDisable2fa} className="max-w-sm space-y-3">
                <p className="text-sm text-slate-500">
                  To disable the authenticator app, confirm your password.
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
                  {twoFaBusy ? "Disabling…" : "Disable authenticator app"}
                </Button>
              </form>
            )}
          </div>
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
