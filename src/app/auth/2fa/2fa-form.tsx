"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyTotpChallenge, verifyRecoveryChallenge, verifyPasskeyChallenge, getMfaFactors } from "./actions";
import { authenticatePasskey, browserSupportsWebAuthn } from "@/lib/passkey/client";
import { beginPasskeyAuthentication } from "@/app/app/settings/security/passkey-actions";
import { Button } from "@/components/ui/button";

type MfaMode = "passkey" | "totp" | "recovery";

export function TwoChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";

  const [mode, setMode] = useState<MfaMode>("passkey");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [factors, setFactors] = useState<{ hasPasskey: boolean; hasTotp: boolean; hasRecoveryCodes: boolean } | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(true);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    setWebauthnSupported(browserSupportsWebAuthn());
    getMfaFactors().then((res) => {
      if (res.success) {
        setFactors(res.data);
        // Default to passkey if available and supported, otherwise TOTP
        if (res.data.hasPasskey && browserSupportsWebAuthn()) {
          setMode("passkey");
        } else if (res.data.hasTotp) {
          setMode("totp");
        } else {
          setMode("recovery");
        }
      }
    });
  }, []);

  async function triggerPasskey() {
    setError(null);
    setPasskeyLoading(true);
    try {
      const beginRes = await beginPasskeyAuthentication();
      if (!beginRes.success) {
        setError(beginRes.error);
        setMode("totp");
        return;
      }
      const options = beginRes.data.options as unknown as import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON;
      const response = await authenticatePasskey(options);
      startTransition(async () => {
        const result = await verifyPasskeyChallenge(response, callbackUrl);
        if (!result.success) {
          setError(result.error);
          setPasskeyLoading(false);
          return;
        }
        router.push(result.data.callbackUrl);
      });
    } catch (err) {
      setPasskeyLoading(false);
      setError(err instanceof Error ? err.message : "Passkey authentication failed");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "totp"
          ? await verifyTotpChallenge(code.trim(), callbackUrl)
          : await verifyRecoveryChallenge(code.trim(), callbackUrl);

      if (!result.success) {
        setError(result.error);
        setCode("");
        return;
      }

      router.push(result.data.callbackUrl);
    });
  }

  const showPasskey = factors?.hasPasskey && webauthnSupported;
  const showTotp = factors?.hasTotp;
  const showRecovery = factors?.hasRecoveryCodes;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Multi-factor authentication</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "passkey"
              ? "Verify your identity with your passkey."
              : mode === "totp"
                ? "Enter the 6-digit code from your authenticator app."
                : "Enter one of your recovery codes."}
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center" role="alert">
            {error}
          </p>
        )}

        {mode === "passkey" && showPasskey && (
          <div className="space-y-4">
            <Button
              type="button"
              className="w-full"
              onClick={triggerPasskey}
              disabled={passkeyLoading || isPending}
            >
              {passkeyLoading ? "Waiting for passkey…" : "Use passkey"}
            </Button>
            <div className="flex flex-col gap-2 text-center">
              {showTotp && (
                <button
                  type="button"
                  onClick={() => { setMode("totp"); setError(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Use authenticator app instead
                </button>
              )}
              {showRecovery && (
                <button
                  type="button"
                  onClick={() => { setMode("recovery"); setError(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Use a recovery code instead
                </button>
              )}
            </div>
          </div>
        )}

        {(mode === "totp" || mode === "recovery") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="code">
                {mode === "totp" ? "Authenticator code" : "Recovery code"}
              </label>
              <input
                id="code"
                type="text"
                inputMode={mode === "totp" ? "numeric" : "text"}
                pattern={mode === "totp" ? "[0-9]{6}" : undefined}
                autoComplete={mode === "totp" ? "one-time-code" : "off"}
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={mode === "totp" ? "000000" : "xxxxxxxxxxxxxxxx"}
              />
            </div>

            <button
              type="submit"
              disabled={isPending || code.length < 6}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Verifying…" : "Verify"}
            </button>

            <div className="flex flex-col gap-2 text-center">
              {showPasskey && (
                <button
                  type="button"
                  onClick={() => { setMode("passkey"); setError(null); setCode(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Use passkey instead
                </button>
              )}
              {mode === "totp" && showRecovery && (
                <button
                  type="button"
                  onClick={() => { setMode("recovery"); setError(null); setCode(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Use a recovery code instead
                </button>
              )}
              {mode === "recovery" && showTotp && (
                <button
                  type="button"
                  onClick={() => { setMode("totp"); setError(null); setCode(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Use authenticator app instead
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
