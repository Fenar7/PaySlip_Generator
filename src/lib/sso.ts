import "server-only";

import { db } from "@/lib/db";
import { requirePlan } from "@/lib/plans/enforcement";

type SsoProvider = "okta" | "azure" | "google" | "saml_custom";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.one";

export async function configureSso(
  orgId: string,
  provider: SsoProvider,
  metadataUrl?: string,
  metadataXml?: string
) {
  await requirePlan(orgId, "enterprise");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { slug: true },
  });

  const acsUrl = `${APP_URL}/api/auth/sso/${org.slug}/callback`;
  const entityId = APP_URL;

  return db.ssoConfig.upsert({
    where: { orgId },
    create: {
      orgId,
      provider,
      metadataUrl: metadataUrl ?? null,
      metadataXml: metadataXml ?? null,
      acsUrl,
      entityId,
      isActive: true,
      ssoEnforced: false,
    },
    update: {
      provider,
      metadataUrl: metadataUrl ?? null,
      metadataXml: metadataXml ?? null,
      acsUrl,
      entityId,
      updatedAt: new Date(),
    },
  });
}

export async function getSsoConfig(orgId: string) {
  return db.ssoConfig.findUnique({ where: { orgId } });
}

export async function toggleSsoEnforcement(orgId: string, enforced: boolean) {
  await requirePlan(orgId, "enterprise");

  return db.ssoConfig.update({
    where: { orgId },
    data: { ssoEnforced: enforced },
  });
}

export async function deleteSsoConfig(orgId: string) {
  return db.ssoConfig.delete({ where: { orgId } });
}

export async function isSsoEnforced(orgSlug: string): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) return false;

  const config = await db.ssoConfig.findUnique({
    where: { orgId: org.id },
    select: { ssoEnforced: true, isActive: true },
  });

  return config?.isActive === true && config?.ssoEnforced === true;
}

export function generateSpMetadata(orgSlug: string): string {
  const acsUrl = `${APP_URL}/api/auth/sso/${orgSlug}/callback`;
  const entityId = APP_URL;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"',
    `  entityID="${entityId}">`,
    '  <md:SPSSODescriptor',
    '    AuthnRequestsSigned="false"',
    '    WantAssertionsSigned="true"',
    '    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">',
    '    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>',
    '    <md:AssertionConsumerService',
    '      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"',
    `      Location="${acsUrl}"`,
    '      index="0"',
    '      isDefault="true"/>',
    '  </md:SPSSODescriptor>',
    '</md:EntityDescriptor>',
  ].join("\n");
}

/**
 * Parse a SAML response to extract user email and name.
 * NOTE: This is a simplified parser for infrastructure setup.
 * Production deployments should use a full SAML library with signature verification.
 */
export function parseSamlResponse(samlXml: string): {
  email: string | null;
  name: string | null;
} {
  const emailMatch =
    samlXml.match(
      /<(?:saml2?:)?NameID[^>]*>([^<]+)<\/(?:saml2?:)?NameID>/
    ) ??
    samlXml.match(
      /<(?:saml2?:)?AttributeValue[^>]*>([^<]+@[^<]+)<\/(?:saml2?:)?AttributeValue>/
    );

  const nameMatch =
    samlXml.match(
      /Name="(?:.*?displayName|.*?givenName|.*?cn)"[^>]*>\s*<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<\/(?:saml2?:)?AttributeValue>/
    );

  return {
    email: emailMatch?.[1]?.trim() ?? null,
    name: nameMatch?.[1]?.trim() ?? null,
  };
}
