import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "recovery" | "email" | "email_change" | null;
  const next = searchParams.get("next") ?? "/onboarding";

  const supabase = await createSupabaseServer();

  // PKCE OAuth flow (Google, etc.) — code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log(`[auth/callback] code exchange success → ${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] code exchange error:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
  }

  // Email OTP / magic link / password-reset flow — token_hash verification
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      const destination = type === "recovery" ? "/auth/reset-password" : next;
      console.log(`[auth/callback] token_hash verify success (${type}) → ${destination}`);
      return NextResponse.redirect(`${origin}${destination}`);
    }
    console.error("[auth/callback] token_hash verify error:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=link_expired`);
  }

  console.warn("[auth/callback] no code or token_hash in request");
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
