"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

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
      await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
      setStep("otp");
    } catch {
      setError("Could not send code. Check the email address.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp });
      if (result?.error) {
        setError("Invalid or expired code.");
      } else {
        router.push("/app/home");
      }
    } catch {
      setError("Invalid or expired code.");
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
