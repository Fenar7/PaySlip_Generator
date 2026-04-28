"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleButton } from "@/features/auth/components/google-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authenticatePasskey, browserSupportsWebAuthn } from "@/lib/passkey/client";

type LoginFormProps = {
  initialError?: string;
  initialEmail?: string;
  initialOrgSlug?: string;
  callbackUrl?: string | null;
  ssoRequired?: boolean;
  ssoErrorCode?: string | null;
};

export function LoginForm({
  initialError = "",
  initialEmail = "",
  initialOrgSlug = "",
  callbackUrl = null,
  ssoRequired = false,
  ssoErrorCode = null,
}: LoginFormProps) {
  const router = useRouter();
  const destination = callbackUrl?.startsWith("/") ? callbackUrl : "/onboarding";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState(initialOrgSlug);
  const [breakGlassCode, setBreakGlassCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPasskeySupported(browserSupportsWebAuthn());
    }
  }, []);

  const ssoMessages: Record<string, string> = {
    sso_required: "This organization requires SSO. Continue with SSO or use an owner break-glass code.",
    sso_login_failed: "SSO sign-in could not be completed. Try again or contact your administrator.",
    invalid_signature: "The SSO response signature was invalid.",
    invalid_audience: "The SSO response audience was invalid.",
    invalid_issuer: "The SSO response issuer was invalid.",
    assertion_expired: "The SSO response expired before it could be used.",
    invalid_destination: "The SSO response was sent to the wrong destination.",
    invalid_request_state: "The SSO sign-in request expired or was already used.",
    assertion_replay: "This SSO response was already used.",
    identity_mapping_failed: "This SSO identity could not be mapped to a local account.",
    metadata_invalid: "SSO configuration is incomplete or metadata validation failed.",
    sso_unavailable: "Enterprise SSO is temporarily unavailable.",
    sso_initiate_failed: "Could not start the SSO sign-in flow.",
  };

  const ssoMessage =
    (ssoRequired ? ssoMessages.sso_required : null) ??
    (ssoErrorCode ? ssoMessages[ssoErrorCode] ?? "SSO sign-in failed." : null);

  function handleStartSso() {
    const slug = orgSlug.trim();
    if (!slug) {
      setError("Enter your organization slug to continue with SSO.");
      return;
    }

    const url = new URL(`/api/auth/sso/${encodeURIComponent(slug)}/initiate`, window.location.origin);
    url.searchParams.set("next", destination);
    window.location.assign(url.toString());
  }

  async function handlePasskeySignIn() {
    if (!passkeySupported) {
      setError("Your browser does not support passkeys.");
      return;
    }
    setError("");
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/signin-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl: destination }),
      });
      const optionsData = (await optionsRes.json()) as {
        success: boolean;
        options?: Record<string, unknown>;
        signinSessionId?: string;
        callbackUrl?: string;
        error?: string;
      };

      if (!optionsData.success || !optionsData.options || !optionsData.signinSessionId) {
        setError(optionsData.error || "Failed to start passkey sign-in.");
        return;
      }

      const response = await authenticatePasskey(
        optionsData.options as unknown as import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON
      );

      const verifyRes = await fetch("/api/auth/passkey/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          signinSessionId: optionsData.signinSessionId,
          callbackUrl: optionsData.callbackUrl ?? destination,
        }),
      });
      const verifyData = (await verifyRes.json()) as {
        success: boolean;
        callbackUrl?: string;
        mfaToken?: string;
        error?: string;
      };

      if (!verifyData.success) {
        setError(verifyData.error || "Passkey sign-in failed.");
        return;
      }

      const nextUrl = verifyData.callbackUrl ?? "/app";
      if (verifyData.mfaToken) {
        const separator = nextUrl.includes("?") ? "&" : "?";
        window.location.assign(
          `${nextUrl}${separator}mfaToken=${encodeURIComponent(verifyData.mfaToken)}`
        );
        return;
      }

      window.location.assign(nextUrl);
    } catch (err) {
      console.error("[login] passkey sign-in error:", err);
      setError("Passkey sign-in failed. Please try again.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          callbackUrl,
          rememberMe,
          orgSlug: orgSlug.trim() || undefined,
          breakGlassCode: breakGlassCode.trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string | null;
        redirectTo?: string;
      };

      if (!response.ok) {
        if (data.code === "email_not_confirmed") {
          router.push("/auth/verify-email?email=" + encodeURIComponent(email));
          return;
        }

        setError(data.error ?? "Invalid email or password");
        return;
      }

      window.location.assign(data.redirectTo || destination);
      return;
    } catch (err) {
      console.error("[login] unexpected error:", err);
      setError("Could not reach login service. Make sure local auth is reachable from this device.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your Slipwise account">
      {ssoMessage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {ssoMessage}
        </div>
      )}
      <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm font-semibold text-[#1a1a1a]">Enterprise SSO</p>
        <p className="mt-1 text-xs text-[#666]">
          Enter your organization slug to continue with SAML SSO.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <Input
            label="Organization slug"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            placeholder="acme"
            autoComplete="organization"
          />
          <Button type="button" variant="secondary" onClick={handleStartSso}>
            Continue with SSO
          </Button>
        </div>
      </div>
      <GoogleButton />
      {passkeySupported && (
        <>
          <Button
            type="button"
            variant="secondary"
            className="w-full mt-3"
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading}
          >
            {passkeyLoading ? "Waiting for passkey…" : "Sign in with passkey"}
          </Button>
        </>
      )}
      <AuthDivider />
      <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        If you enabled a passkey, you may be asked to use it as a second verification step after sign-in.
      </p>
      <form
        action="/api/auth/password-login"
        method="post"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="text-right mt-1">
            <Link href="/auth/forgot-password" className="text-xs text-[#dc2626] hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#666]">
          <input
            type="checkbox"
            name="rememberMe"
            value="true"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-strong)] text-[#dc2626] focus:ring-[#dc2626]"
          />
          <span>Remember me</span>
        </label>
        {!rememberMe ? <input type="hidden" name="rememberMe" value="false" /> : null}
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold text-[#1a1a1a]">
            Break-glass sign-in
          </p>
          <p className="mt-1 text-xs text-[#666]">
            Owners can use a one-time emergency code here after password sign-in.
          </p>
          <div className="mt-3">
            <Input
              label="Break-glass code (optional)"
              name="breakGlassCode"
              value={breakGlassCode}
              onChange={(e) => setBreakGlassCode(e.target.value)}
              placeholder="ABCD-EFGH-IJKL-MNOP"
              autoComplete="one-time-code"
            />
          </div>
        </div>
        <input type="hidden" name="orgSlug" value={orgSlug} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-[#666] mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-[#dc2626] font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
