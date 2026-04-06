import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
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

    if (!config.metadataUrl) {
      return NextResponse.json(
        { error: "SSO metadata URL not configured" },
        { status: 400 }
      );
    }

    // Build SAMLRequest redirect URL
    // In production, this would create a proper deflated/encoded SAMLRequest
    const samlRequestParams = new URLSearchParams({
      SAMLRequest: Buffer.from(
        `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"` +
        ` AssertionConsumerServiceURL="${config.acsUrl}"` +
        ` Destination="${config.metadataUrl}"` +
        ` IssueInstant="${new Date().toISOString()}"` +
        ` Version="2.0">` +
        `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${config.entityId}</saml:Issuer>` +
        `</samlp:AuthnRequest>`
      ).toString("base64"),
      RelayState: orgSlug,
    });

    const redirectUrl = `${config.metadataUrl}?${samlRequestParams.toString()}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("SSO initiate error:", error);
    return NextResponse.json({ error: "SSO initiation failed" }, { status: 500 });
  }
}
