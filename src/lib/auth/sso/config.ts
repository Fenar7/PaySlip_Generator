/**
 * SSO Configuration Service — Phase 28 Sprint 28.3
 *
 * Unified SSO management supporting both SAML 2.0 and OIDC protocols.
 * Handles configuration, testing, and enforcement workflows.
 */
"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type SsoConfigSummary = {
  id: string;
  protocol: string;
  provider: string;
  isActive: boolean;
  ssoEnforced: boolean;
  testedAt: Date | null;
  lastLoginAt: Date | null;
  metadataStatus: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getSsoConfig(): Promise<ActionResult<SsoConfigSummary | null>> {
  const { orgId: organizationId } = await requireRole("admin");

  const config = await db.ssoConfig.findUnique({
    where: { orgId: organizationId },
  });

  if (!config) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      id: config.id,
      protocol: config.protocol,
      provider: config.provider,
      isActive: config.isActive,
      ssoEnforced: config.ssoEnforced,
      testedAt: config.testedAt,
      lastLoginAt: config.lastLoginAt,
      metadataStatus: config.metadataStatus,
    },
  };
}

// ─── SAML Configuration ───────────────────────────────────────────────────────

export async function configureSaml(input: {
  provider: string;
  metadataUrl?: string;
  metadataXml?: string;
  entityId: string;
  acsUrl: string;
}): Promise<ActionResult<{ id: string }>> {
  const { orgId: organizationId } = await requireRole("admin");

  if (!input.metadataUrl && !input.metadataXml) {
    return { success: false, error: "Either metadata URL or XML must be provided" };
  }

  if (!input.entityId || !input.acsUrl) {
    return { success: false, error: "Entity ID and ACS URL are required" };
  }

  const config = await db.ssoConfig.upsert({
    where: { orgId: organizationId },
    create: {
      orgId: organizationId,
      protocol: "SAML",
      provider: input.provider,
      metadataUrl: input.metadataUrl || null,
      metadataXml: input.metadataXml || null,
      entityId: input.entityId,
      acsUrl: input.acsUrl,
      metadataStatus: input.metadataUrl ? "PENDING" : "VALID",
    },
    update: {
      protocol: "SAML",
      provider: input.provider,
      metadataUrl: input.metadataUrl || null,
      metadataXml: input.metadataXml || null,
      entityId: input.entityId,
      acsUrl: input.acsUrl,
      metadataStatus: input.metadataUrl ? "PENDING" : "VALID",
      // Clear OIDC fields when switching to SAML
      oidcIssuerUrl: null,
      oidcClientId: null,
      oidcClientSecret: null,
      oidcJwksUrl: null,
      oidcScopes: [],
      oidcEmailDomains: [],
    },
  });

  return { success: true, data: { id: config.id } };
}

// ─── OIDC Configuration ───────────────────────────────────────────────────────

export async function configureOidc(input: {
  provider: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string[];
  emailDomains?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const { orgId: organizationId } = await requireRole("admin");

  if (!input.issuerUrl || !input.clientId || !input.clientSecret) {
    return { success: false, error: "Issuer URL, Client ID, and Client Secret are required" };
  }

  // Validate issuer URL format
  try {
    new URL(input.issuerUrl);
  } catch {
    return { success: false, error: "Invalid issuer URL format" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const acsUrl = `${baseUrl}/api/auth/oidc/callback`;

  const config = await db.ssoConfig.upsert({
    where: { orgId: organizationId },
    create: {
      orgId: organizationId,
      protocol: "OIDC",
      provider: input.provider,
      entityId: input.clientId,
      acsUrl,
      oidcIssuerUrl: input.issuerUrl,
      oidcClientId: input.clientId,
      oidcClientSecret: input.clientSecret,
      oidcScopes: input.scopes || ["openid", "email", "profile"],
      oidcEmailDomains: input.emailDomains || [],
      metadataStatus: "PENDING",
    },
    update: {
      protocol: "OIDC",
      provider: input.provider,
      entityId: input.clientId,
      acsUrl,
      oidcIssuerUrl: input.issuerUrl,
      oidcClientId: input.clientId,
      oidcClientSecret: input.clientSecret,
      oidcScopes: input.scopes || ["openid", "email", "profile"],
      oidcEmailDomains: input.emailDomains || [],
      metadataStatus: "PENDING",
      // Clear SAML fields when switching to OIDC
      metadataUrl: null,
      metadataXml: null,
      idpEntityId: null,
      idpSsoUrl: null,
      idpSsoBinding: null,
      idpCertificates: undefined,
    },
  });

  return { success: true, data: { id: config.id } };
}

// ─── Enforcement ──────────────────────────────────────────────────────────────

export async function toggleSsoEnforcement(
  enforced: boolean
): Promise<ActionResult<void>> {
  const { orgId: organizationId } = await requireRole("admin");

  const config = await db.ssoConfig.findUnique({
    where: { orgId: organizationId },
  });

  if (!config) {
    return { success: false, error: "SSO is not configured" };
  }

  // Cannot enforce SSO that hasn't been tested
  if (enforced && !config.testedAt) {
    return { success: false, error: "SSO must be tested successfully before enforcement" };
  }

  if (enforced && !config.isActive) {
    return { success: false, error: "SSO must be active before enforcement" };
  }

  await db.ssoConfig.update({
    where: { orgId: organizationId },
    data: { ssoEnforced: enforced },
  });

  return { success: true, data: undefined };
}

export async function markSsoTested(): Promise<ActionResult<void>> {
  const { orgId: organizationId } = await requireRole("admin");

  await db.ssoConfig.update({
    where: { orgId: organizationId },
    data: {
      testedAt: new Date(),
      lastFailureAt: null,
      lastFailureReason: null,
    },
  });

  return { success: true, data: undefined };
}

export async function deactivateSso(): Promise<ActionResult<void>> {
  const { orgId: organizationId } = await requireRole("admin");

  await db.ssoConfig.update({
    where: { orgId: organizationId },
    data: {
      isActive: false,
      ssoEnforced: false,
    },
  });

  return { success: true, data: undefined };
}

// ─── Group Mappings ───────────────────────────────────────────────────────────

export async function upsertGroupMapping(input: {
  externalGroup: string;
  role: string;
  customRoleId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const { orgId: organizationId } = await requireRole("admin");

  const config = await db.ssoConfig.findUnique({
    where: { orgId: organizationId },
  });

  if (!config) {
    return { success: false, error: "SSO is not configured" };
  }

  const mapping = await db.ssoGroupMapping.upsert({
    where: {
      ssoConfigId_externalGroup: {
        ssoConfigId: config.id,
        externalGroup: input.externalGroup,
      },
    },
    create: {
      ssoConfigId: config.id,
      externalGroup: input.externalGroup,
      role: input.role,
      customRoleId: input.customRoleId || null,
    },
    update: {
      role: input.role,
      customRoleId: input.customRoleId || null,
    },
  });

  return { success: true, data: { id: mapping.id } };
}

export async function deleteGroupMapping(mappingId: string): Promise<ActionResult<void>> {
  const { orgId: organizationId } = await requireRole("admin");

  const config = await db.ssoConfig.findUnique({
    where: { orgId: organizationId },
  });

  if (!config) {
    return { success: false, error: "SSO is not configured" };
  }

  const mapping = await db.ssoGroupMapping.findFirst({
    where: { id: mappingId, ssoConfigId: config.id },
  });

  if (!mapping) {
    return { success: false, error: "Mapping not found" };
  }

  await db.ssoGroupMapping.delete({ where: { id: mappingId } });

  return { success: true, data: undefined };
}
