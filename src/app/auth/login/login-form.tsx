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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      } else {
        console.log("[login] signed in successfully");
        router.push(destination);
        router.refresh();
      }
    } catch (err) {
      console.error("[login] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your Slipwise account">
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
