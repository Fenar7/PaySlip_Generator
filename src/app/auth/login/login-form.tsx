"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
        router.replace(destination);
        router.refresh();
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
      <AuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div>
          <Input
            label="Password"
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
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-strong)] text-[#dc2626] focus:ring-[#dc2626]"
          />
          <span>Remember me</span>
        </label>
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
              value={breakGlassCode}
              onChange={(e) => setBreakGlassCode(e.target.value)}
              placeholder="ABCD-EFGH-IJKL-MNOP"
              autoComplete="one-time-code"
            />
          </div>
        </div>
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
