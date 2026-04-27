"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyTotpChallenge, verifyRecoveryChallenge, verifyPasskeyChallenge, getMfaFactors } from "./actions";
import { authenticatePasskey, browserSupportsWebAuthn } from "@/lib/passkey/client";
import { beginPasskeyAuthentication } from "@/app/app/settings/security/passkey-actions";
import { signOutSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type MfaMode = "passkey" | "totp" | "recovery";
const PASSKEY_VERIFY_TIMEOUT_MS = 20_000;
type MfaFactors = {
  status: "challenge" | "skip" | "setup";
  callbackUrl: string;
  setupUrl?: string;
  hasPasskey: boolean;
  hasTotp: boolean;
  hasRecoveryCodes: boolean;
};

export function TwoChallengeForm() {
  const router = useRouter();
  const { push, refresh, replace } = router;
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";

  const [mode, setMode] = useState<MfaMode>("passkey");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [factors, setFactors] = useState<MfaFactors | null>(null);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [webauthnSupported, setWebauthnSupported] = useState(true);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyAttempted, setPasskeyAttempted] = useState(false);

  useEffect(() => {
    const supportsWebAuthn = browserSupportsWebAuthn();
    setWebauthnSupported(supportsWebAuthn);
    getMfaFactors(callbackUrl).then((res) => {
      if (res.success) {
        if (res.data.status === "skip") {
          replace(res.data.callbackUrl);
          refresh();
          return;
        }
        if (res.data.status === "setup") {
          replace(res.data.setupUrl ?? "/app/settings/security?setupMfa=1");
          refresh();
          return;
        }
        setFactors(res.data);
        if (res.data.hasPasskey && supportsWebAuthn) {
          setMode("passkey");
        } else if (res.data.hasTotp) {
          setMode("totp");
        } else {
          setMode("recovery");
        }
      } else {
        setError(res.error);
      }
    }).finally(() => {
      setLoadingFactors(false);
    });
  }, [callbackUrl, refresh, replace]);

  async function triggerPasskey() {
    setError(null);
    setPasskeyLoading(true);
    setPasskeyAttempted(true);
    try {
      const beginRes = await beginPasskeyAuthentication();
      if (!beginRes.success) {
        setError(beginRes.error);
        return;
      }
      const options = beginRes.data.options as unknown as import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON;
      const response = await authenticatePasskey(options);
      const result = await withTimeout(
        verifyPasskeyChallenge(response, callbackUrl),
        PASSKEY_VERIFY_TIMEOUT_MS,
        "Passkey verification took too long. Try again."
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      replace(result.data.callbackUrl);
      refresh();
    } catch (err) {
      setError(getPasskeyErrorMessage(err));
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function backToSignIn() {
    await signOutSupabaseBrowser();
    replace("/auth/login");
    refresh();
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

      push(result.data.callbackUrl);
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
            {loadingFactors
              ? "Checking your verification methods…"
              : mode === "passkey"
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

        {loadingFactors && (
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
            Checking your account before showing a verification method.
          </div>
        )}

        {!loadingFactors && mode === "passkey" && showPasskey && (
          <div className="space-y-4">
            <Button
              type="button"
              className="w-full"
              onClick={triggerPasskey}
              disabled={passkeyLoading || isPending}
            >
              {passkeyLoading ? "Waiting for passkey…" : "Use passkey"}
            </Button>
            {passkeyAttempted && error && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={triggerPasskey}
                disabled={passkeyLoading || isPending}
              >
                Try passkey again
              </Button>
            )}
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
              {!showTotp && !showRecovery && (
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        )}

        {!loadingFactors && mode === "passkey" && factors?.hasPasskey && !webauthnSupported && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This browser does not support passkeys. Use another enrolled verification method or sign in from a supported device.
            </p>
            {showTotp && (
              <Button type="button" variant="secondary" className="w-full" onClick={() => setMode("totp")}>
                Use authenticator app
              </Button>
            )}
            {showRecovery && (
              <Button type="button" variant="secondary" className="w-full" onClick={() => setMode("recovery")}>
                Use recovery code
              </Button>
            )}
            {!showTotp && !showRecovery && (
              <button
                type="button"
                onClick={backToSignIn}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        )}

        {!loadingFactors && !showPasskey && !showTotp && !showRecovery && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              No verification method is available for this account. Sign in again or contact your administrator.
            </p>
            <Button type="button" variant="secondary" className="w-full" onClick={backToSignIn}>
              Back to sign in
            </Button>
          </div>
        )}

        {!loadingFactors && (mode === "totp" || mode === "recovery") && (
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function getPasskeyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Passkey authentication failed. Try again.";

  if (error.name === "NotAllowedError") {
    return "Passkey verification was cancelled or timed out. Try again.";
  }

  return error.message || "Passkey authentication failed. Try again.";
}
