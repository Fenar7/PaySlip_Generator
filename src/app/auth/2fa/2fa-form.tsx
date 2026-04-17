"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyTotpChallenge, verifyRecoveryChallenge } from "./actions";

export function TwoChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";

  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Two-factor authentication</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your 8-character recovery codes."}
          </p>
        </div>

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

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || code.length < 6}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Verifying…" : "Verify"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "totp" ? "recovery" : "totp"));
              setCode("");
              setError(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {mode === "totp" ? "Use a recovery code instead" : "Use authenticator app instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
