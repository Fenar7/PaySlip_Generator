"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleButton } from "@/features/auth/components/google-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearSupabaseBrowserSessionStorage,
  createSupabaseBrowser,
  setBrowserSessionPersistence,
} from "@/lib/supabase/client";
import { authenticatePasskey, browserSupportsWebAuthn } from "@/lib/passkey/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const destination = callbackUrl?.startsWith("/") ? callbackUrl : "/onboarding";
  const initialEmail = searchParams.get("sso_email") ?? "";
  const initialOrgSlug = searchParams.get("org") ?? "";
  const ssoErrorCode = searchParams.get("sso_error");
  const ssoRequired = searchParams.get("sso_required") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState(initialOrgSlug);
  const [breakGlassCode, setBreakGlassCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(true);
  const [ssoOpen, setSsoOpen] = useState(ssoRequired || Boolean(initialOrgSlug));
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);

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
      await clearSupabaseBrowserSessionStorage();
      setBrowserSessionPersistence(rememberMe ? "remembered" : "session");
      const supabase = createSupabaseBrowser({ rememberSession: rememberMe });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
       if (signInError) {
         console.error("[login] signIn error:", signInError.message, signInError.code);
         if (signInError.code === "email_not_confirmed") {
           await supabase.auth.resend({ type: "signup", email });
           router.push("/auth/verify-email?email=" + encodeURIComponent(email));
           return;
         }
         setError(signInError.message ?? "Invalid email or password");
         return;
       }

       if (breakGlassCode.trim()) {
         if (!orgSlug.trim()) {
           await supabase.auth.signOut();
           setError("Enter your organization slug to redeem a break-glass code.");
           return;
         }

         const response = await fetch("/api/auth/sso/break-glass/redeem", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             email,
             orgSlug: orgSlug.trim(),
             code: breakGlassCode.trim(),
           }),
         });

         if (!response.ok) {
           await supabase.auth.signOut();
           const data = await response.json().catch(() => ({ error: "" }));
           setError(data.error || "Break-glass code was rejected.");
           return;
         }
       }

        console.log("[login] signed in successfully");
        window.location.assign(destination);
        return;
      } catch (err) {
        console.error("[login] unexpected error:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your Slipwise account">
      {ssoMessage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {ssoMessage}
        </div>
      )}

      <div className="space-y-3">
        <GoogleButton callbackURL={destination} />
        {passkeySupported && (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-center gap-2 border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading}
          >
            <KeyRound className="h-4 w-4 text-gray-500" />
            {passkeyLoading ? "Waiting for passkey…" : "Sign in with passkey"}
          </Button>
        )}
      </div>

      <AuthDivider text="or" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#dc2626] focus:ring-[#dc2626]"
            />
            Remember me
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-[#dc2626] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-10 w-full bg-[#dc2626] text-white hover:bg-[#b91c1c]"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-center">
        {!ssoOpen ? (
          <button
            type="button"
            onClick={() => setSsoOpen(true)}
            className="block w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Sign in with SSO →
          </button>
        ) : (
          <div className="space-y-2 text-left">
            <p className="text-sm font-medium text-gray-700">Enterprise SSO</p>
            <Input
              label="Organization slug"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="acme"
              autoComplete="organization"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full border-gray-300 text-sm"
              onClick={handleStartSso}
            >
              Continue with SSO
            </Button>
            <button
              type="button"
              onClick={() => setSsoOpen(false)}
              className="block text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}

        {!breakGlassOpen ? (
          <button
            type="button"
            onClick={() => setBreakGlassOpen(true)}
            className="block w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Use break-glass code →
          </button>
        ) : (
          <div className="space-y-2 text-left">
            <p className="text-sm font-medium text-gray-700">Break-glass recovery</p>
            {!orgSlug && (
              <Input
                label="Organization slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="acme"
                autoComplete="organization"
              />
            )}
            <Input
              label="Break-glass code"
              value={breakGlassCode}
              onChange={(e) => setBreakGlassCode(e.target.value)}
              placeholder="ABCD-EFGH-IJKL-MNOP"
              autoComplete="one-time-code"
            />
            <button
              type="button"
              onClick={() => setBreakGlassOpen(false)}
              className="block text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-[#dc2626] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
