"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowser } from "@/lib/supabase/client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        console.error("[verify-email] resend error:", error.message, error.code);
        setSent(false);
      } else {
        console.log("[verify-email] resend success for:", email);
        setSent(true);
      }
    } catch (err) {
      console.error("[verify-email] unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Check your inbox"
      subtitle={
        email ? `We sent a verification link to ${email}` : "We sent you a verification link"
      }
    >
      <div className="text-center space-y-4">
        <div className="text-5xl">📬</div>
        <p className="text-sm text-[#666]">
          Click the link in your email to verify your account. Check your spam folder if you
          don&apos;t see it.
        </p>
        {sent ? (
          <p className="text-sm text-green-600 font-medium">Verification email resent!</p>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleResend}
            disabled={loading || !email}
          >
            {loading ? "Sending…" : "Resend verification email"}
          </Button>
        )}
        <Link href="/auth/login" className="block text-sm text-[#dc2626] hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
