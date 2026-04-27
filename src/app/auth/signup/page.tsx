"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthHeroPanel } from "@/features/auth/components/auth-hero-panel";
import { GoogleButton } from "@/features/auth/components/google-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          // After email verification, Supabase redirects here to exchange the
          // PKCE code for a session and then forward to onboarding.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (signUpError) {
        console.error("[signup] signUp error:", signUpError.message, signUpError.code);
        setError(signUpError.message ?? "Could not create account");
      } else if (data.session) {
        // Email confirmations disabled — user is already signed in
        console.log("[signup] signed up and session created immediately (no confirmation)");
        router.push("/onboarding");
        router.refresh();
      } else {
        // Email confirmation required
        console.log("[signup] user created, awaiting email confirmation");
        router.push("/auth/verify-email?email=" + encodeURIComponent(email));
      }
    } catch (err) {
      console.error("[signup] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Start with Slipwise"
      title="Create your account"
      subtitle="Open one secure account for every document workflow, then invite your team when you are ready."
      aside={
        <AuthHeroPanel
          badge="A calmer first-run experience"
          title="Turn signup into a product introduction, not just a form."
          description="The new account creation flow explains what Slipwise helps with while keeping the path to first success short and clear."
          supportingPoints={["Guided onboarding", "Security from day one", "Built for team handoff"]}
          highlights={[
            {
              icon: FolderKanban,
              title: "One home for recurring work",
              description:
                "Start with a single account that can later support payroll, finance, and document preparation workflows.",
            },
            {
              icon: LockKeyhole,
              title: "Secure by default",
              description:
                "Email verification, stronger passwords, and optional passkeys keep the account setup flow trustworthy from the start.",
            },
            {
              icon: Users,
              title: "Ready to grow with your team",
              description:
                "A better signup experience should feel polished for one person today and credible for a full team tomorrow.",
            },
          ]}
          footer="Good onboarding communicates value early, then lets the form stay focused on only the inputs needed to get started."
        />
      }
    >
      <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,241,235,0.92))] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-2">
          {["Guided setup", "Secure account", "Invite your team later"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1.5 text-[0.72rem] font-medium text-[var(--foreground-soft)]"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--foreground-soft)]">
          Start with Google for the quickest setup, or create an email and password account now
          and add passkeys later from your security settings.
        </p>
      </div>

      <div className="mt-5">
        <GoogleButton callbackURL="/onboarding" label="Continue with Google" />
      </div>

      <AuthDivider text="or create an account with email" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
        <div className="flex items-start gap-3 rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-soft)]/70 px-4 py-3 text-sm leading-7 text-[var(--foreground-soft)]">
          <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--accent)]" />
          <span>
            Use at least 8 characters for your password. You can add stronger account protections
            like passkeys after setup.
          </span>
        </div>
        {error && (
          <p className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" className="h-12 w-full rounded-2xl" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--foreground-soft)]">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
