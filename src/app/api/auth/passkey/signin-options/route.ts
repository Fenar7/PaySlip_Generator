import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { storeChallenge } from "@/lib/passkey/challenge-store";
import { getRpId } from "@/lib/passkey/server";
import { randomUUID } from "crypto";

/**
 * Start a primary passkey sign-in flow (discoverable credentials).
 *
 * Returns WebAuthn authentication options with an empty allowCredentials list,
 * which prompts the browser to show all discoverable credentials.
 * A temporary signinSessionId is generated to track the challenge.
 */
export async function POST(request: NextRequest) {
  try {
    const { callbackUrl } = (await request.json().catch(() => ({}))) as {
      callbackUrl?: string;
    };

    const signinSessionId = randomUUID();
    const rpId = getRpId();

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: [], // empty = discoverable credentials
      userVerification: "required",
    });

    await storeChallenge(signinSessionId, "authentication", options.challenge);

    return NextResponse.json({
      success: true,
      options,
      signinSessionId,
      callbackUrl: callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/app",
    });
  } catch (err) {
    console.error("[passkey-signin-options] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to start passkey sign-in" },
      { status: 500 }
    );
  }
}
