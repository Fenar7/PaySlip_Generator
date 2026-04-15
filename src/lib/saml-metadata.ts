import "server-only";

import { XMLParser } from "fast-xml-parser";

export const HTTP_REDIRECT_BINDING =
  "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";
export const HTTP_POST_BINDING =
  "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST";

export interface ParsedIdentityProviderMetadata {
  entityId: string;
  ssoUrl: string;
  ssoBinding: string;
  certificates: string[];
  sourceXml: string;
}

const metadataParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}

function toPemCertificate(value: string): string {
  const normalized = value.replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");

  if (!normalized) {
    throw new Error("Identity provider metadata certificate is empty.");
  }

  const chunks = normalized.match(/.{1,64}/g) ?? [normalized];
  return `-----BEGIN CERTIFICATE-----\n${chunks.join("\n")}\n-----END CERTIFICATE-----`;
}

function pickEntityDescriptor(parsed: unknown): Record<string, unknown> {
  if (
    typeof parsed !== "object" ||
    parsed == null ||
    !("EntityDescriptor" in parsed || "EntitiesDescriptor" in parsed)
  ) {
    throw new Error("Identity provider metadata XML is not a valid SAML metadata document.");
  }

  if ("EntityDescriptor" in parsed) {
    const direct = (parsed as { EntityDescriptor?: Record<string, unknown> }).EntityDescriptor;
    if (direct) {
      return direct;
    }
  }

  const entitiesDescriptor = (parsed as {
    EntitiesDescriptor?: { EntityDescriptor?: Record<string, unknown> | Record<string, unknown>[] };
  }).EntitiesDescriptor;

  const descriptors = asArray(entitiesDescriptor?.EntityDescriptor);
  const idpDescriptor = descriptors.find((descriptor) => descriptor.IDPSSODescriptor);

  if (!idpDescriptor) {
    throw new Error("Identity provider metadata does not contain an IDPSSODescriptor.");
  }

  return idpDescriptor;
}

function pickSingleSignOnService(
  services: Array<Record<string, unknown>>,
): { binding: string; location: string } {
  const preferredBindings = [HTTP_REDIRECT_BINDING, HTTP_POST_BINDING];

  for (const binding of preferredBindings) {
    const match = services.find(
      (service) =>
        typeof service.Binding === "string" &&
        service.Binding === binding &&
        typeof service.Location === "string" &&
        service.Location.length > 0,
    );

    if (match) {
      return {
        binding,
        location: match.Location as string,
      };
    }
  }

  const fallback = services.find(
    (service) =>
      typeof service.Binding === "string" &&
      typeof service.Location === "string" &&
      service.Location.length > 0,
  );

  if (!fallback) {
    throw new Error("Identity provider metadata does not expose a usable SSO endpoint.");
  }

  return {
    binding: fallback.Binding as string,
    location: fallback.Location as string,
  };
}

export function parseIdentityProviderMetadata(
  metadataXml: string,
): ParsedIdentityProviderMetadata {
  const xml = metadataXml.trim();
  if (!xml) {
    throw new Error("Identity provider metadata XML is required.");
  }

  const parsed = metadataParser.parse(xml) as Record<string, unknown>;
  const entityDescriptor = pickEntityDescriptor(parsed);
  const idpDescriptor = entityDescriptor.IDPSSODescriptor as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;

  const resolvedIdpDescriptor = asArray(idpDescriptor)[0];
  if (!resolvedIdpDescriptor) {
    throw new Error("Identity provider metadata does not contain an IDPSSODescriptor.");
  }

  const entityId = entityDescriptor.entityID;
  if (typeof entityId !== "string" || entityId.length === 0) {
    throw new Error("Identity provider metadata is missing entityID.");
  }

  const ssoService = pickSingleSignOnService(
    asArray(
      resolvedIdpDescriptor.SingleSignOnService as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined,
    ),
  );

  const certificates = asArray(
    resolvedIdpDescriptor.KeyDescriptor as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  )
    .flatMap((descriptor) => {
      const keyInfo = descriptor.KeyInfo as Record<string, unknown> | undefined;
      const x509Data = keyInfo?.X509Data as Record<string, unknown> | undefined;
      return asArray(x509Data?.X509Certificate as string | string[] | undefined);
    })
    .map(toPemCertificate);

  if (certificates.length === 0) {
    throw new Error("Identity provider metadata does not include signing certificates.");
  }

  return {
    entityId,
    ssoUrl: ssoService.location,
    ssoBinding: ssoService.binding,
    certificates,
    sourceXml: xml,
  };
}

export async function loadIdentityProviderMetadata(input: {
  metadataUrl?: string | null;
  metadataXml?: string | null;
}): Promise<ParsedIdentityProviderMetadata> {
  const inlineXml = input.metadataXml?.trim();
  if (inlineXml) {
    return parseIdentityProviderMetadata(inlineXml);
  }

  const metadataUrl = input.metadataUrl?.trim();
  if (!metadataUrl) {
    throw new Error("Identity provider metadata URL or XML is required.");
  }

  const response = await fetch(metadataUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/samlmetadata+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch identity provider metadata (${response.status}).`);
  }

  return parseIdentityProviderMetadata(await response.text());
}
