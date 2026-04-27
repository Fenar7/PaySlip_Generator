"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthHeroPanel } from "@/features/auth/components/auth-hero-panel";
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
  const [advancedOpen, setAdvancedOpen] = useState(ssoRequired || Boolean(initialOrgSlug));

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
    <AuthCard
      eyebrow="Secure sign-in"
      title="Welcome back"
      subtitle="Choose the fastest path into your Slipwise workspace, then reveal enterprise and recovery options only when you need them."
      aside={
        <AuthHeroPanel
          badge="Made for secure teams"
          title="Sign in quickly without guessing which option comes first."
          description="Primary access stays focused on the methods most people use every day, while enterprise and recovery tools remain close at hand when the situation calls for them."
          supportingPoints={["Google sign-in", "Passkeys ready", "SSO when needed"]}
          highlights={[
            {
              icon: KeyRound,
              title: "Passkeys stay front and center",
              description:
                "People who already enrolled a passkey can jump straight in without digging through a crowded form.",
            },
            {
              icon: Building2,
              title: "Enterprise access stays explicit",
              description:
                "SSO is still available, but it sits in a dedicated section instead of competing with every other method at once.",
            },
            {
              icon: LifeBuoy,
              title: "Recovery is visible, not noisy",
              description:
                "Break-glass access remains discoverable for owners while staying out of the way for everyone else.",
            },
          ]}
          footer="A focused login screen lowers hesitation for first-time users without reducing the strength of the security model behind it."
        />
      }
    >
      {ssoMessage && (
        <div className="mb-4 rounded-[1.4rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900 shadow-[var(--shadow-soft)]">
          {ssoMessage}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,241,235,0.92))] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-2">
          {["Password sign-in", "Google sign-in", "Passkeys ready"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1.5 text-[0.72rem] font-medium text-[var(--foreground-soft)]"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--foreground-soft)]">
          Start with the most common sign-in methods first. Enterprise SSO and emergency
          recovery stay available inside a separate section below.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <GoogleButton callbackURL={destination} />
        {passkeySupported && (
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full justify-center gap-3 rounded-2xl border-[var(--border-soft)] bg-white shadow-[0_16px_34px_rgba(34,34,34,0.05)]"
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading}
          >
            <KeyRound className="h-4.5 w-4.5 text-[var(--accent)]" />
            {passkeyLoading ? "Waiting for passkey…" : "Sign in with passkey"}
          </Button>
        )}
      </div>

      <p className="mt-4 flex items-start gap-3 rounded-[1.4rem] border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm leading-7 text-blue-900">
        <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0" />
        <span>
          If you enabled a passkey, you may be asked to use it as a second verification step
          after sign-in.
        </span>
      </p>

      <AuthDivider text="or continue with email" />

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
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-[var(--foreground-soft)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-strong)] text-[#dc2626] focus:ring-[#dc2626]"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)]/70 p-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            className="flex w-full items-start justify-between gap-4 text-left"
            aria-expanded={advancedOpen}
          >
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Enterprise & recovery options
              </p>
              <p className="mt-1 text-sm leading-7 text-[var(--foreground-soft)]">
                Reveal SSO and break-glass access only when your organization requires them.
              </p>
            </div>
            {advancedOpen ? (
              <ChevronUp className="mt-1 h-4.5 w-4.5 shrink-0 text-[var(--foreground-soft)]" />
            ) : (
              <ChevronDown className="mt-1 h-4.5 w-4.5 shrink-0 text-[var(--foreground-soft)]" />
            )}
          </button>

          {advancedOpen && (
            <div className="mt-4 space-y-4 border-t border-[var(--border-soft)] pt-4">
              <div className="rounded-[1.3rem] border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Building2 className="h-4.5 w-4.5" />
                  </span>
                  <div className="w-full">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Enterprise SSO</p>
                    <p className="mt-1 text-sm leading-7 text-[var(--foreground-soft)]">
                      Enter your organization slug to continue with your company&apos;s SAML
                      sign-in flow.
                    </p>
                    <div className="mt-3 flex flex-col gap-3">
                      <Input
                        label="Organization slug"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value)}
                        placeholder="acme"
                        autoComplete="organization"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 rounded-2xl"
                        onClick={handleStartSso}
                      >
                        Continue with SSO
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.3rem] border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <LifeBuoy className="h-4.5 w-4.5" />
                  </span>
                  <div className="w-full">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Break-glass recovery
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[var(--foreground-soft)]">
                      Owners can add a one-time emergency code here before submitting their
                      password sign-in.
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
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" className="h-12 w-full rounded-2xl" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-[var(--foreground-soft)]">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="font-semibold text-[var(--accent)] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
