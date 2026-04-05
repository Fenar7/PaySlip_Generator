"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function OTPPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Redirect to callback after magic-link click (alternative to entering code)
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpError) {
        console.error("[otp] signInWithOtp error:", otpError.message, otpError.code);
        setError(otpError.message ?? "Could not send code. Check the email address.");
      } else {
        console.log("[otp] OTP email sent to:", email);
        setStep("otp");
      }
    } catch (err) {
      console.error("[otp] unexpected error:", err);
      setError("Could not send code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (verifyError) {
        console.error("[otp] verifyOtp error:", verifyError.message, verifyError.code);
        setError("Invalid or expired code. Please request a new one.");
      } else {
        console.log("[otp] verified successfully");
        router.push("/app/home");
        router.refresh();
      }
    } catch (err) {
      console.error("[otp] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Sign in with code"
      subtitle={
        step === "email"
          ? "We'll email you a one-time code"
          : `Enter the code sent to ${email}`
      }
    >
      {step === "email" ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <Input
            label="6-digit code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            autoComplete="one-time-code"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
            {loading ? "Verifying…" : "Verify code"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-sm text-[#666] hover:text-[#1a1a1a]"
          >
            ← Use a different email
          </button>
        </form>
      )}
      <p className="text-center text-sm text-[#666] mt-4">
        <Link href="/auth/login" className="text-[#dc2626] hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
