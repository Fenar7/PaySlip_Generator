import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSsoRuntimeDisabledReason, parseSamlResponse } from "@/lib/sso";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const disabledReason = getSsoRuntimeDisabledReason();
  if (disabledReason) {
    return NextResponse.json({ error: disabledReason }, { status: 503 });
  }

  const { orgSlug } = await params;

  try {
    const org = await db.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const config = await db.ssoConfig.findUnique({
      where: { orgId: org.id },
    });
    if (!config || !config.isActive) {
      return NextResponse.json({ error: "SSO not configured" }, { status: 404 });
    }

    // Parse SAML response from form body
    const formData = await request.formData();
    const samlResponseB64 = formData.get("SAMLResponse") as string | null;
    if (!samlResponseB64) {
      return NextResponse.json({ error: "Missing SAMLResponse" }, { status: 400 });
    }

    const samlXml = Buffer.from(samlResponseB64, "base64").toString("utf-8");

    // NOTE: In production, verify the XML signature against IdP certificate here
    const { email, name } = parseSamlResponse(samlXml);
    if (!email) {
      return NextResponse.json(
        { error: "Could not extract email from SAML assertion" },
        { status: 400 }
      );
    }

    // Find or create profile
    const profile = await db.profile.findUnique({ where: { email } });
    if (!profile) {
      // In a full implementation, we'd create a Supabase auth user first.
      // For now, if the profile doesn't exist, redirect to sign-up with SSO context.
      const signupUrl = new URL("/auth/login", request.nextUrl.origin);
      signupUrl.searchParams.set("sso_email", email);
      signupUrl.searchParams.set("org", orgSlug);
      return NextResponse.redirect(signupUrl);
    }

    // Find or create membership
    const existing = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: profile.id,
        },
      },
    });

    if (!existing) {
      await db.member.create({
        data: {
          organizationId: org.id,
          userId: profile.id,
          role: "member",
        },
      });
    }

    // Update active org preference
    await db.userOrgPreference.upsert({
      where: { userId: profile.id },
      create: { userId: profile.id, activeOrgId: org.id },
      update: { activeOrgId: org.id },
    });

    // Redirect to login with SSO token context
    // In production, this would create a Supabase session via admin API
    const loginUrl = new URL("/auth/callback", request.nextUrl.origin);
    loginUrl.searchParams.set("sso", "1");
    loginUrl.searchParams.set("email", email);
    loginUrl.searchParams.set("org", orgSlug);
    if (name) loginUrl.searchParams.set("name", name);
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("SSO callback error:", error);
    return NextResponse.json({ error: "SSO callback failed" }, { status: 500 });
  }
}
