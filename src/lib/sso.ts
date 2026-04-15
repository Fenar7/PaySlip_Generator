import "server-only";

import crypto from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { SAML, ValidateInResponseTo, type Profile } from "@node-saml/node-saml";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requirePlan } from "@/lib/plans/enforcement";
import { logAudit } from "@/lib/audit";
import {
  HTTP_POST_BINDING,
  loadIdentityProviderMetadata,
} from "@/lib/saml-metadata";
import {
  readSsoSessionCookie,
  type SsoSessionMode,
} from "@/lib/sso-session";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

type SsoProvider = "okta" | "azure" | "google" | "saml_custom";

type SsoConfigRecord = Awaited<ReturnType<typeof getSsoConfigForOrg>>["config"];

const APP_URL = (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);
const SSO_METADATA_REFRESH_MS = 1000 * 60 * 60 * 24;
const SSO_AUTHN_REQUEST_TTL_MS = 1000 * 60 * 10;
const SSO_ASSERTION_REPLAY_TTL_MS = 1000 * 60 * 60 * 12;

const SSO_EMAIL_ATTRIBUTE_KEYS = [
  "email",
  "mail",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "urn:oid:0.9.2342.19200300.100.1.3",
];

const SSO_NAME_ATTRIBUTE_KEYS = [
  "displayName",
  "name",
  "full_name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
];

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeJsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function getMetadataUrlForOrg(orgSlug: string): string {
  return `${APP_URL}/api/auth/sso/${orgSlug}/metadata`;
}

function getAcsUrlForOrg(orgSlug: string): string {
  return `${APP_URL}/api/auth/sso/${orgSlug}/callback`;
}

function getRequestDefaultRedirect(mode: "LOGIN" | "TEST"): string {
  return mode === "TEST" ? "/app/settings/security/sso" : "/app/home";
}

export function getPublicSsoFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("signature")) return "invalid_signature";
  if (lower.includes("audience")) return "invalid_audience";
  if (lower.includes("issuer")) return "invalid_issuer";
  if (lower.includes("timing") || lower.includes("expired") || lower.includes("notonorafter")) {
    return "assertion_expired";
  }
  if (lower.includes("destination") || lower.includes("recipient")) {
    return "invalid_destination";
  }
  if (lower.includes("inresponseto")) return "invalid_request_state";
  if (lower.includes("replay")) return "assertion_replay";
  if (lower.includes("metadata")) return "metadata_invalid";
  if (lower.includes("samlresponse")) return "missing_response";
  if (lower.includes("identity") || lower.includes("email")) return "identity_mapping_failed";

  return "login_failed";
}

function generateBreakGlassCode(): string {
  const raw = crypto
    .randomBytes(12)
    .toString("base64url")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 16);

  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

function hashBreakGlassCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

function toIsoInstant(date = new Date()): string {
  return date.toISOString();
}

function createAuthnRequestXml(params: {
  requestId: string;
  acsUrl: string;
  destination: string;
  entityId: string;
}): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<samlp:AuthnRequest',
    ' xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"',
    ' xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"',
    ` ID="${params.requestId}"`,
    ' Version="2.0"',
    ` IssueInstant="${toIsoInstant()}"`,
    ` Destination="${params.destination}"`,
    ` AssertionConsumerServiceURL="${params.acsUrl}"`,
    ` ProtocolBinding="${HTTP_POST_BINDING}">`,
    `  <saml:Issuer>${params.entityId}</saml:Issuer>`,
    '  <samlp:NameIDPolicy',
    '    AllowCreate="true"',
    '    Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>',
    "</samlp:AuthnRequest>",
  ].join("");
}

function encodeRedirectBindingRequest(xml: string): string {
  return deflateRawSync(Buffer.from(xml, "utf-8")).toString("base64");
}

function decodeSamlResponse(samlResponse: string): string {
  try {
    return Buffer.from(samlResponse, "base64").toString("utf-8");
  } catch {
    throw new Error("SAML response is not valid base64.");
  }
}

function readAttribute(profile: Profile, keys: string[]): string | null {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractEmailFromProfile(profile: Profile): string | null {
  return normalizeEmail(
    profile.email ??
      profile.mail ??
      readAttribute(profile, SSO_EMAIL_ATTRIBUTE_KEYS) ??
      profile.nameID,
  );
}

function extractDisplayNameFromProfile(profile: Profile): string | null {
  return normalizeText(
    readAttribute(profile, SSO_NAME_ATTRIBUTE_KEYS) ?? profile.nameID,
  );
}

function extractResponseEnvelope(xml: string): {
  responseId: string | null;
  assertionId: string | null;
  inResponseTo: string | null;
  destination: string | null;
  issuer: string | null;
} {
  const read = (pattern: RegExp): string | null =>
    normalizeText(pattern.exec(xml)?.[1]);

  const responseTag =
    /<(?:\w+:)?Response\b([^>]*)>/i.exec(xml)?.[1] ?? "";
  const assertionTag =
    /<(?:\w+:)?Assertion\b([^>]*)>/i.exec(xml)?.[1] ?? "";

  const readAttribute = (source: string, name: string): string | null => {
    const match = new RegExp(`${name}="([^"]+)"`, "i").exec(source);
    return normalizeText(match?.[1]);
  };

  return {
    responseId: readAttribute(responseTag, "ID"),
    assertionId: readAttribute(assertionTag, "ID"),
    inResponseTo: readAttribute(responseTag, "InResponseTo"),
    destination: readAttribute(responseTag, "Destination"),
    issuer: read(/<(?:\w+:)?Issuer\b[^>]*>([^<]+)<\/(?:\w+:)?Issuer>/i),
  };
}

function buildLoginPath(orgSlug: string, reason: string): string {
  const params = new URLSearchParams({
    org: orgSlug,
    sso_required: "1",
    sso_error: reason,
    callbackUrl: "/app/home",
  });

  return `/auth/login?${params.toString()}`;
}

function createRequestCacheProvider(orgId: string) {
  return {
    async saveAsync(key: string, value: string) {
      const now = new Date();
      const record = await db.ssoAuthnRequest.upsert({
        where: { requestId: key },
        update: {
          orgId,
          expiresAt: new Date(now.getTime() + SSO_AUTHN_REQUEST_TTL_MS),
          consumedAt: null,
          redirectTo: getRequestDefaultRedirect("LOGIN"),
        },
        create: {
          orgId,
          requestId: key,
          redirectTo: getRequestDefaultRedirect("LOGIN"),
          expiresAt: new Date(now.getTime() + SSO_AUTHN_REQUEST_TTL_MS),
        },
      });

      return {
        value,
        createdAt: record.createdAt.getTime(),
      };
    },
    async getAsync(key: string) {
      const record = await db.ssoAuthnRequest.findUnique({
        where: { requestId: key },
        select: {
          orgId: true,
          expiresAt: true,
          consumedAt: true,
        },
      });

      if (
        !record ||
        record.orgId !== orgId ||
        record.consumedAt ||
        record.expiresAt <= new Date()
      ) {
        return null;
      }

      return "valid";
    },
    async removeAsync(key: string | null) {
      if (!key) {
        return null;
      }

      const record = await db.ssoAuthnRequest.findUnique({
        where: { requestId: key },
        select: { id: true, orgId: true, consumedAt: true },
      });

      if (!record || record.orgId !== orgId) {
        return null;
      }

      if (!record.consumedAt) {
        await db.ssoAuthnRequest.update({
          where: { id: record.id },
          data: { consumedAt: new Date() },
        });
      }

      return "removed";
    },
  };
}

function createSamlClient(config: NonNullable<SsoConfigRecord>): SAML {
  const certificates = normalizeJsonStringArray(config.idpCertificates);

  if (!config.idpSsoUrl || !config.idpEntityId || certificates.length === 0) {
    throw new Error("SSO metadata is incomplete.");
  }

  return new SAML({
    entryPoint: config.idpSsoUrl,
    idpCert: certificates,
    issuer: config.entityId,
    callbackUrl: config.acsUrl,
    audience: config.entityId,
    idpIssuer: config.idpEntityId,
    acceptedClockSkewMs: 5 * 60 * 1000,
    maxAssertionAgeMs: 5 * 60 * 1000,
    validateInResponseTo: ValidateInResponseTo.always,
    cacheProvider: createRequestCacheProvider(config.orgId),
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    identifierFormat: null,
    disableRequestedAuthnContext: true,
  });
}

async function getSsoConfigForOrg(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      slug: true,
      ssoConfig: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found.");
  }

  return {
    org: {
      id: org.id,
      slug: org.slug,
    },
    config: org.ssoConfig,
  };
}

async function resolveOrgAndConfigBySlug(orgSlug: string) {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      slug: true,
      ssoConfig: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found.");
  }

  if (!org.ssoConfig || !org.ssoConfig.isActive) {
    throw new Error("SSO is not configured for this organization.");
  }

  return org;
}

async function setSsoConfigFailure(
  orgId: string,
  reason: string,
): Promise<void> {
  await db.ssoConfig.updateMany({
    where: { orgId },
    data: {
      lastFailureAt: new Date(),
      lastFailureReason: reason,
    },
  });
}

export async function recordSsoFailure(orgSlug: string, reason: string): Promise<void> {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) {
    return;
  }

  await setSsoConfigFailure(org.id, reason);
}

async function ensureFreshSsoMetadata(
  config: NonNullable<SsoConfigRecord>,
): Promise<NonNullable<SsoConfigRecord>> {
  const certificates = normalizeJsonStringArray(config.idpCertificates);
  const needsRefresh =
    certificates.length === 0 ||
    !config.idpEntityId ||
    !config.idpSsoUrl ||
    config.metadataStatus !== "VALID" ||
    (config.metadataUrl &&
      (!config.metadataNextRefreshAt ||
        config.metadataNextRefreshAt <= new Date()));

  if (!needsRefresh) {
    return config;
  }

  const metadata = await loadIdentityProviderMetadata({
    metadataUrl: config.metadataUrl,
    metadataXml: config.metadataXml,
  });

  return db.ssoConfig.update({
    where: { orgId: config.orgId },
    data: {
      metadataXml: config.metadataUrl ? config.metadataXml : metadata.sourceXml,
      idpEntityId: metadata.entityId,
      idpSsoUrl: metadata.ssoUrl,
      idpSsoBinding: metadata.ssoBinding,
      idpCertificates: metadata.certificates,
      metadataStatus: "VALID",
      metadataError: null,
      metadataLastFetchedAt: new Date(),
      metadataNextRefreshAt: config.metadataUrl
        ? new Date(Date.now() + SSO_METADATA_REFRESH_MS)
        : null,
      testedAt:
        config.idpEntityId === metadata.entityId &&
        config.idpSsoUrl === metadata.ssoUrl &&
        config.idpSsoBinding === metadata.ssoBinding &&
        arraysEqual(certificates, metadata.certificates)
          ? config.testedAt
          : null,
    },
  });
}

export function getSsoRuntimeDisabledReason(): string | null {
  if (env.FEATURE_SSO_ENABLED === "false") {
    return "SSO is disabled by FEATURE_SSO_ENABLED.";
  }

  return null;
}

export function isSsoRuntimeEnabled(): boolean {
  return getSsoRuntimeDisabledReason() === null;
}

export function generateSpMetadata(orgSlug: string): string {
  const acsUrl = getAcsUrlForOrg(orgSlug);
  const entityId = getMetadataUrlForOrg(orgSlug);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"',
    ` entityID="${entityId}">`,
    '  <md:SPSSODescriptor',
    '    AuthnRequestsSigned="false"',
    '    WantAssertionsSigned="true"',
    '    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">',
    '    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>',
    '    <md:AssertionConsumerService',
    `      Binding="${HTTP_POST_BINDING}"`,
    `      Location="${acsUrl}"`,
    '      index="0"',
    '      isDefault="true"/>',
    '  </md:SPSSODescriptor>',
    "</md:EntityDescriptor>",
  ].join("\n");
}

export async function getSsoConfig(orgId: string) {
  const { config } = await getSsoConfigForOrg(orgId);
  return config;
}

export async function configureSso(
  orgId: string,
  provider: SsoProvider,
  metadataUrl?: string,
  metadataXml?: string,
) {
  return saveSsoConfig({
    orgId,
    actorId: "system",
    provider,
    metadataUrl,
    metadataXml,
    ssoEnforced: false,
    skipAudit: true,
  });
}

export async function saveSsoConfig(params: {
  orgId: string;
  actorId: string;
  provider: SsoProvider;
  metadataUrl?: string;
  metadataXml?: string;
  ssoEnforced: boolean;
  skipAudit?: boolean;
}) {
  await requirePlan(params.orgId, "enterprise");

  const { org, config: existing } = await getSsoConfigForOrg(params.orgId);
  const metadata = await loadIdentityProviderMetadata({
    metadataUrl: params.metadataUrl ?? existing?.metadataUrl ?? null,
    metadataXml: params.metadataXml ?? existing?.metadataXml ?? null,
  });

  const nextMetadataUrl = normalizeText(params.metadataUrl) ?? null;
  const nextMetadataXml = nextMetadataUrl ? null : metadata.sourceXml;
  const nextEntityId = getMetadataUrlForOrg(org.slug);
  const nextAcsUrl = getAcsUrlForOrg(org.slug);
  const existingCertificates = normalizeJsonStringArray(existing?.idpCertificates);

  const metadataChanged =
    !existing ||
    existing.provider !== params.provider ||
    existing.metadataUrl !== nextMetadataUrl ||
    (normalizeText(existing.metadataXml) ?? null) !== nextMetadataXml ||
    existing.idpEntityId !== metadata.entityId ||
    existing.idpSsoUrl !== metadata.ssoUrl ||
    existing.idpSsoBinding !== metadata.ssoBinding ||
    !arraysEqual(existingCertificates, metadata.certificates) ||
    existing.entityId !== nextEntityId ||
    existing.acsUrl !== nextAcsUrl;

  const testedAt = metadataChanged ? null : existing?.testedAt ?? null;
  if (params.ssoEnforced && !testedAt) {
    throw new Error("Test SSO successfully before enabling enforcement.");
  }

  const saved = await db.ssoConfig.upsert({
    where: { orgId: params.orgId },
    create: {
      orgId: params.orgId,
      provider: params.provider,
      metadataUrl: nextMetadataUrl,
      metadataXml: nextMetadataXml,
      acsUrl: nextAcsUrl,
      entityId: nextEntityId,
      idpEntityId: metadata.entityId,
      idpSsoUrl: metadata.ssoUrl,
      idpSsoBinding: metadata.ssoBinding,
      idpCertificates: metadata.certificates,
      metadataStatus: "VALID",
      metadataError: null,
      metadataLastFetchedAt: new Date(),
      metadataNextRefreshAt: nextMetadataUrl
        ? new Date(Date.now() + SSO_METADATA_REFRESH_MS)
        : null,
      isActive: true,
      ssoEnforced: params.ssoEnforced,
      testedAt,
    },
    update: {
      provider: params.provider,
      metadataUrl: nextMetadataUrl,
      metadataXml: nextMetadataXml,
      acsUrl: nextAcsUrl,
      entityId: nextEntityId,
      idpEntityId: metadata.entityId,
      idpSsoUrl: metadata.ssoUrl,
      idpSsoBinding: metadata.ssoBinding,
      idpCertificates: metadata.certificates,
      metadataStatus: "VALID",
      metadataError: null,
      metadataLastFetchedAt: new Date(),
      metadataNextRefreshAt: nextMetadataUrl
        ? new Date(Date.now() + SSO_METADATA_REFRESH_MS)
        : null,
      isActive: true,
      ssoEnforced: params.ssoEnforced,
      testedAt,
      lastFailureAt: null,
      lastFailureReason: null,
    },
  });

  if (!params.skipAudit) {
    await logAudit({
      orgId: params.orgId,
      actorId: params.actorId,
      action: "sso.config_updated",
      entityType: "sso_config",
      entityId: saved.id,
      metadata: {
        provider: saved.provider,
        enforced: saved.ssoEnforced,
        metadataMode: saved.metadataUrl ? "url" : "xml",
      },
    });
  }

  return saved;
}

export async function refreshSsoMetadata(orgId: string, actorId: string) {
  await requirePlan(orgId, "enterprise");

  const { config } = await getSsoConfigForOrg(orgId);
  if (!config) {
    throw new Error("SSO is not configured.");
  }

  const existingCertificates = normalizeJsonStringArray(config.idpCertificates);
  const metadata = await loadIdentityProviderMetadata({
    metadataUrl: config.metadataUrl,
    metadataXml: config.metadataXml,
  });

  const metadataChanged =
    config.idpEntityId !== metadata.entityId ||
    config.idpSsoUrl !== metadata.ssoUrl ||
    config.idpSsoBinding !== metadata.ssoBinding ||
    !arraysEqual(existingCertificates, metadata.certificates);

  const refreshed = await db.ssoConfig.update({
    where: { orgId },
    data: {
      metadataXml: config.metadataUrl ? config.metadataXml : metadata.sourceXml,
      idpEntityId: metadata.entityId,
      idpSsoUrl: metadata.ssoUrl,
      idpSsoBinding: metadata.ssoBinding,
      idpCertificates: metadata.certificates,
      metadataStatus: "VALID",
      metadataError: null,
      metadataLastFetchedAt: new Date(),
      metadataNextRefreshAt: config.metadataUrl
        ? new Date(Date.now() + SSO_METADATA_REFRESH_MS)
        : null,
      testedAt: metadataChanged ? null : config.testedAt,
    },
  });

  await logAudit({
    orgId,
    actorId,
    action: "sso.metadata_refreshed",
    entityType: "sso_config",
    entityId: refreshed.id,
    metadata: {
      metadataChanged,
      metadataMode: refreshed.metadataUrl ? "url" : "xml",
    },
  });

  return refreshed;
}

export async function toggleSsoEnforcement(orgId: string, enforced: boolean) {
  await requirePlan(orgId, "enterprise");

  const config = await db.ssoConfig.findUnique({
    where: { orgId },
  });

  if (!config) {
    throw new Error("SSO is not configured.");
  }

  if (enforced) {
    if (!isSsoRuntimeEnabled()) {
      throw new Error(getSsoRuntimeDisabledReason() ?? "SSO is not available.");
    }

    if (!config.testedAt) {
      throw new Error("Test SSO successfully before enabling enforcement.");
    }
  }

  return db.ssoConfig.update({
    where: { orgId },
    data: { ssoEnforced: enforced },
  });
}

export async function deleteSsoConfig(orgId: string, actorId?: string) {
  const existing = await db.ssoConfig.findUnique({
    where: { orgId },
    select: { id: true },
  });

  const deleted = await db.ssoConfig.delete({ where: { orgId } });

  if (actorId && existing) {
    await logAudit({
      orgId,
      actorId,
      action: "sso.config_deleted",
      entityType: "sso_config",
      entityId: existing.id,
    });
  }

  return deleted;
}

export async function isSsoEnforced(orgSlug: string): Promise<boolean> {
  if (!isSsoRuntimeEnabled()) return false;

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

export async function getSsoAccessModeForUser(
  orgId: string,
  userId: string,
  role: string,
): Promise<SsoSessionMode | null> {
  if (!isSsoRuntimeEnabled()) {
    return null;
  }

  const config = await db.ssoConfig.findUnique({
    where: { orgId },
    select: { isActive: true, ssoEnforced: true },
  });

  if (!config?.isActive || !config.ssoEnforced) {
    return null;
  }

  const session = await readSsoSessionCookie();
  if (!session || session.orgId !== orgId || session.userId !== userId) {
    return null;
  }

  if (session.mode === "break_glass" && role !== "owner") {
    return null;
  }

  return session.mode;
}

export async function issueBreakGlassCode(orgId: string, actorId: string) {
  await requirePlan(orgId, "enterprise");

  const config = await db.ssoConfig.findUnique({
    where: { orgId },
    select: { id: true, isActive: true },
  });

  if (!config?.isActive) {
    throw new Error("SSO must be configured before issuing break-glass codes.");
  }

  const code = generateBreakGlassCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60);

  await db.$transaction([
    db.ssoBreakGlassCode.updateMany({
      where: {
        orgId,
        redeemedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        expiresAt: now,
      },
    }),
    db.ssoBreakGlassCode.create({
      data: {
        orgId,
        codeHash: hashBreakGlassCode(code),
        issuedByUserId: actorId,
        expiresAt,
      },
    }),
  ]);

  await logAudit({
    orgId,
    actorId,
    action: "sso.break_glass_issued",
    entityType: "sso_break_glass_code",
    metadata: {
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    code,
    expiresAt,
  };
}

export async function redeemBreakGlassCode(params: {
  orgSlug: string;
  email: string;
  code: string;
}) {
  const org = await db.organization.findUnique({
    where: { slug: params.orgSlug },
    select: {
      id: true,
      slug: true,
      ssoConfig: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!org?.ssoConfig?.isActive) {
    throw new Error("SSO is not configured for this organization.");
  }

  const email = normalizeEmail(params.email);
  if (!email) {
    throw new Error("Email is required.");
  }

  const member = await db.member.findFirst({
    where: {
      organizationId: org.id,
      role: "owner",
      user: {
        email,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!member) {
    throw new Error("Break-glass is only available to organization owners.");
  }

  const codeHash = hashBreakGlassCode(params.code);
  const breakGlassCode = await db.ssoBreakGlassCode.findFirst({
    where: {
      orgId: org.id,
      codeHash,
      redeemedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
    },
  });

  if (!breakGlassCode) {
    throw new Error("Break-glass code is invalid or expired.");
  }

  await db.$transaction([
    db.ssoBreakGlassCode.update({
      where: { id: breakGlassCode.id },
      data: {
        redeemedAt: new Date(),
        redeemedByUserId: member.userId,
      },
    }),
    db.userOrgPreference.upsert({
      where: { userId: member.userId },
      create: { userId: member.userId, activeOrgId: org.id },
      update: { activeOrgId: org.id },
    }),
  ]);

  await logAudit({
    orgId: org.id,
    actorId: member.userId,
    action: "sso.break_glass_redeemed",
    entityType: "sso_break_glass_code",
    entityId: breakGlassCode.id,
    metadata: {
      email,
    },
  });

  return {
    orgId: org.id,
    userId: member.userId,
  };
}

export async function createSsoAuthnRequest(params: {
  orgSlug: string;
  mode: "LOGIN" | "TEST";
  next?: string | null;
}) {
  if (!isSsoRuntimeEnabled()) {
    throw new Error(getSsoRuntimeDisabledReason() ?? "SSO is unavailable.");
  }

  const org = await resolveOrgAndConfigBySlug(params.orgSlug);
  let config = org.ssoConfig;

  try {
    config = await ensureFreshSsoMetadata(config);
  } catch (error) {
    await db.ssoConfig.update({
      where: { orgId: org.id },
      data: {
        metadataStatus: "FAILED",
        metadataError: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  const requestId = `_${crypto.randomUUID()}`;
  const redirectTo = getSafeRedirectPath(
    params.next,
    getRequestDefaultRedirect(params.mode),
  );

  await db.ssoAuthnRequest.create({
    data: {
      orgId: org.id,
      requestId,
      mode: params.mode,
      redirectTo,
      expiresAt: new Date(Date.now() + SSO_AUTHN_REQUEST_TTL_MS),
    },
  });

  const xml = createAuthnRequestXml({
    requestId,
    acsUrl: config.acsUrl,
    destination: config.idpSsoUrl!,
    entityId: config.entityId,
  });

  if (config.idpSsoBinding === HTTP_POST_BINDING) {
    return {
      kind: "post" as const,
      actionUrl: config.idpSsoUrl!,
      samlRequest: Buffer.from(xml, "utf-8").toString("base64"),
      relayState: requestId,
    };
  }

  const samlRequest = encodeRedirectBindingRequest(xml);
  const redirectUrl = new URL(config.idpSsoUrl!);
  redirectUrl.searchParams.set("SAMLRequest", samlRequest);
  redirectUrl.searchParams.set("RelayState", requestId);

  return {
    kind: "redirect" as const,
    redirectUrl: redirectUrl.toString(),
  };
}

export async function completeSsoLogin(params: {
  orgSlug: string;
  samlResponse: string;
  relayState?: string | null;
}) {
  if (!isSsoRuntimeEnabled()) {
    throw new Error(getSsoRuntimeDisabledReason() ?? "SSO is unavailable.");
  }

  const org = await resolveOrgAndConfigBySlug(params.orgSlug);
  let config = org.ssoConfig;

  try {
    config = await ensureFreshSsoMetadata(config);
  } catch (error) {
    await db.ssoConfig.update({
      where: { orgId: org.id },
      data: {
        metadataStatus: "FAILED",
        metadataError: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  const samlResponseXml = decodeSamlResponse(params.samlResponse);
  const envelope = extractResponseEnvelope(samlResponseXml);

  if (!envelope.inResponseTo) {
    throw new Error("SAML response is missing InResponseTo.");
  }

  if (params.relayState && params.relayState !== envelope.inResponseTo) {
    throw new Error("RelayState does not match the SAML request.");
  }

  if (envelope.destination && envelope.destination !== config.acsUrl) {
    throw new Error("SAML response destination does not match the configured ACS URL.");
  }

  const saml = createSamlClient(config);
  const { profile } = await saml.validatePostResponseAsync({
    SAMLResponse: params.samlResponse,
  });

  if (!profile) {
    throw new Error("SAML response did not contain an authentication assertion.");
  }

  const request = await db.ssoAuthnRequest.findUnique({
    where: { requestId: envelope.inResponseTo },
    select: {
      id: true,
      mode: true,
      redirectTo: true,
      expiresAt: true,
    },
  });

  if (!request || request.expiresAt <= new Date()) {
    throw new Error("SSO request state has expired.");
  }

  if (!envelope.assertionId) {
    throw new Error("SAML assertion is missing an ID.");
  }

  const existingReplay = await db.ssoAssertionReplay.findUnique({
    where: { assertionId: envelope.assertionId },
    select: { id: true },
  });

  if (existingReplay) {
    throw new Error("SAML assertion replay detected.");
  }

  const email = extractEmailFromProfile(profile);
  if (!email) {
    throw new Error("Verified SAML assertion did not provide an email address.");
  }

  const displayName = extractDisplayNameFromProfile(profile) ?? email.split("@")[0];
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
    throw new Error(linkError?.message ?? "Failed to issue a local session for the SSO user.");
  }

  const existingProfileByEmail = await db.profile.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingProfileByEmail && existingProfileByEmail.id !== linkData.user.id) {
    throw new Error("Existing profile email does not match the SSO auth user.");
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

    await tx.ssoAssertionReplay.create({
      data: {
        orgId: org.id,
        assertionId: envelope.assertionId!,
        responseId: envelope.responseId,
        nameId: normalizeText(profile.nameID),
        expiresAt: new Date(Date.now() + SSO_ASSERTION_REPLAY_TTL_MS),
      },
    });

    await tx.ssoConfig.update({
      where: { orgId: org.id },
      data: {
        metadataStatus: "VALID",
        metadataError: null,
        testedAt: request.mode === "TEST" ? new Date() : config.testedAt,
        lastFailureAt: null,
        lastFailureReason: null,
        lastLoginAt: new Date(),
        lastLoginEmail: email,
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
    action: request.mode === "TEST" ? "sso.test_succeeded" : "sso.login_succeeded",
    entityType: "sso_config",
    entityId: config.id,
    metadata: {
      email,
      provisionedMembership: !existingMembership,
      issuer: envelope.issuer,
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
      },
    });
  }

  return {
    orgId: org.id,
    userId: linkData.user.id,
    mode: request.mode,
    redirectTo: request.redirectTo,
  };
}

export async function getSsoLoginPathForUser(
  orgId: string,
  orgSlug: string,
  userId: string,
  role: string,
): Promise<string | null> {
  if (!isSsoRuntimeEnabled()) {
    return null;
  }

  const config = await db.ssoConfig.findUnique({
    where: { orgId },
    select: { isActive: true, ssoEnforced: true },
  });

  if (!config?.isActive || !config.ssoEnforced) {
    return null;
  }

  const accessMode = await getSsoAccessModeForUser(orgId, userId, role);
  if (accessMode) {
    return null;
  }

  return buildLoginPath(orgSlug, "sso_required");
}
