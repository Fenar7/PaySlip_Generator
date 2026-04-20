/**
 * OIDC Callback Route — Phase 28 Sprint 28.3
 *
 * Handles the OIDC authorization code callback.
 * Exchanges code for tokens, validates ID token, and creates a session.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  parseOidcState,
  fetchDiscoveryDocument,
  exchangeCodeForTokens,
  verifyIdTokenSignature,
  validateIdTokenClaims,
} from "@/lib/auth/sso/oidc";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    const errorDescription = searchParams.get("error_description") || "Unknown error";
    return NextResponse.redirect(
      new URL(`/auth/login?error=sso_failed&detail=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/auth/login?error=sso_invalid_response", request.url)
    );
  }

  // Parse and validate state
  const stateData = parseOidcState(state);
  if (!stateData) {
    return NextResponse.redirect(
      new URL("/auth/login?error=sso_state_expired", request.url)
    );
  }

  try {
    // Load org SSO config
    const org = await db.organization.findFirst({
      where: { slug: stateData.orgSlug },
      include: { ssoConfig: true },
    });

    if (!org?.ssoConfig || org.ssoConfig.protocol !== "OIDC") {
      return NextResponse.redirect(
        new URL("/auth/login?error=sso_not_configured", request.url)
      );
    }

    const ssoConfig = org.ssoConfig;

    if (!ssoConfig.oidcIssuerUrl || !ssoConfig.oidcClientId || !ssoConfig.oidcClientSecret) {
      return NextResponse.redirect(
        new URL("/auth/login?error=sso_incomplete_config", request.url)
      );
    }

    // Fetch discovery document
    const discovery = await fetchDiscoveryDocument(ssoConfig.oidcIssuerUrl);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const oidcConfig = {
      issuerUrl: ssoConfig.oidcIssuerUrl,
      clientId: ssoConfig.oidcClientId,
      clientSecret: ssoConfig.oidcClientSecret,
      redirectUri: `${baseUrl}/api/auth/oidc/callback`,
      scopes: ssoConfig.oidcScopes.length > 0 ? ssoConfig.oidcScopes : ["openid", "email", "profile"],
    };

    // Exchange code for tokens
    // The code verifier is embedded in the state for stateless PKCE support.
    // The state itself is cryptographically signed + time-bounded (10 min TTL).
    const tokens = await exchangeCodeForTokens(
      oidcConfig,
      discovery,
      code,
      stateData.codeVerifier || ""
    );

    if (!tokens.id_token) {
      return NextResponse.redirect(
        new URL("/auth/login?error=sso_no_id_token", request.url)
      );
    }

    // Verify JWT signature via JWKS and decode claims
    const claims = await verifyIdTokenSignature(tokens.id_token, discovery.jwks_uri);
    const validation = validateIdTokenClaims(claims, oidcConfig, stateData.nonce);

    if (!validation.valid) {
      await db.ssoConfig.update({
        where: { orgId: org.id },
        data: {
          lastFailureAt: new Date(),
          lastFailureReason: validation.reason,
        },
      });
      return NextResponse.redirect(
        new URL(`/auth/login?error=sso_token_invalid&detail=${encodeURIComponent(validation.reason)}`, request.url)
      );
    }

    // Validate email domain if restricted
    const email = claims.email;
    if (!email) {
      return NextResponse.redirect(
        new URL("/auth/login?error=sso_no_email", request.url)
      );
    }

    if (ssoConfig.oidcEmailDomains.length > 0) {
      const emailDomain = email.split("@")[1]?.toLowerCase();
      const allowed = ssoConfig.oidcEmailDomains.some(
        (d) => d.toLowerCase() === emailDomain
      );
      if (!allowed) {
        return NextResponse.redirect(
          new URL("/auth/login?error=sso_domain_not_allowed", request.url)
        );
      }
    }

    const displayName = claims.name?.trim() || claims.preferred_username?.trim() || email.split("@")[0];
    const supabaseAdmin = await createSupabaseAdmin();
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          data: { full_name: displayName, name: displayName },
        },
      });

    if (linkError || !linkData.user || !linkData.properties.hashed_token) {
      throw new Error(linkError?.message ?? "Failed to issue a local session for the OIDC user.");
    }

    const existingProfileByEmail = await db.profile.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingProfileByEmail && existingProfileByEmail.id !== linkData.user.id) {
      throw new Error("Existing profile email does not match the OIDC auth user.");
    }

    const existingMembership = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: linkData.user.id,
        },
      },
      select: { role: true },
    });

    // Update SSO config with last successful login
    await db.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { id: linkData.user.id },
        update: {
          email,
          name: displayName,
        },
        create: {
          id: linkData.user.id,
          email,
          name: displayName,
        },
      });

      if (!existingMembership) {
        await tx.member.create({
          data: {
            organizationId: org.id,
            userId: linkData.user.id,
            role: "member",
          },
        });
      }

      await tx.userOrgPreference.upsert({
        where: { userId: linkData.user.id },
        create: { userId: linkData.user.id, activeOrgId: org.id },
        update: { activeOrgId: org.id },
      });

      await tx.ssoConfig.update({
        where: { orgId: org.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginEmail: email,
          metadataStatus: "VALID",
          lastFailureAt: null,
          lastFailureReason: null,
          testedAt: ssoConfig.testedAt ?? new Date(),
        },
      });
    });

    const supabase = await createSupabaseServer();
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (otpError) {
      throw new Error(otpError.message);
    }

    await logAudit({
      orgId: org.id,
      actorId: linkData.user.id,
      action: "sso.login_succeeded",
      entityType: "sso_config",
      entityId: ssoConfig.id,
      metadata: {
        email,
        protocol: "OIDC",
        issuer: claims.iss,
        provisionedMembership: !existingMembership,
      },
    });

    if (!existingMembership) {
      await logAudit({
        orgId: org.id,
        actorId: linkData.user.id,
        action: "sso.member_provisioned",
        entityType: "member",
        entityId: linkData.user.id,
        metadata: {
          email,
          protocol: "OIDC",
        },
      });
    }

    return NextResponse.redirect(new URL("/app", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/auth/login?error=sso_exception&detail=${encodeURIComponent(message)}`, request.url)
    );
  }
}
