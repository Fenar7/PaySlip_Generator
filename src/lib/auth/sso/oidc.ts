/**
 * OIDC Connector — Phase 28 Sprint 28.3
 *
 * Implements OpenID Connect authentication with PKCE flow.
 * Supports discovery document parsing, authorization URL generation,
 * token exchange, and ID token validation via JWKS.
 */

import { createHmac, randomBytes, createHash } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
}

export interface OidcTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface OidcIdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  groups?: string[];
}

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface JwksKey {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  x5c?: string[];
}

export interface JwksDocument {
  keys: JwksKey[];
}

// ─── Discovery ────────────────────────────────────────────────────────────────

/**
 * Fetch and parse an OIDC Discovery document from the well-known URL.
 */
export async function fetchDiscoveryDocument(
  issuerUrl: string
): Promise<OidcDiscoveryDocument> {
  const wellKnownUrl = issuerUrl.replace(/\/$/, "") + "/.well-known/openid-configuration";

  const response = await fetch(wellKnownUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status} ${response.statusText}`);
  }

  const doc = (await response.json()) as OidcDiscoveryDocument;

  if (!doc.issuer || !doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) {
    throw new Error("Invalid OIDC discovery document: missing required fields");
  }

  return doc;
}

// ─── PKCE Challenge ───────────────────────────────────────────────────────────

/**
 * Generate a PKCE code verifier (high-entropy random string).
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Derive the PKCE code challenge from a verifier using S256.
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// ─── Authorization URL ────────────────────────────────────────────────────────

export interface AuthorizationParams {
  config: OidcConfig;
  discovery: OidcDiscoveryDocument;
  state: string;
  nonce: string;
  codeVerifier: string;
}

/**
 * Build the OIDC authorization redirect URL with PKCE.
 */
export function buildAuthorizationUrl(params: AuthorizationParams): string {
  const { config, discovery, state, nonce, codeVerifier } = params;
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

/**
 * Exchange an authorization code for tokens using PKCE.
 */
export async function exchangeCodeForTokens(
  config: OidcConfig,
  discovery: OidcDiscoveryDocument,
  code: string,
  codeVerifier: string
): Promise<OidcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Token exchange failed: ${response.status} - ${errorBody}`);
  }

  return (await response.json()) as OidcTokenResponse;
}

// ─── ID Token Validation ──────────────────────────────────────────────────────

/**
 * Decode a JWT without verification (for extracting header/claims).
 * MUST be followed by signature verification.
 */
export function decodeJwtUnsafe(token: string): {
  header: { alg: string; kid?: string; typ?: string };
  payload: OidcIdTokenClaims;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

  return { header, payload };
}

/**
 * Fetch JWKS from the provider's JWKS URI.
 */
export async function fetchJwks(jwksUri: string): Promise<JwksDocument> {
  const response = await fetch(jwksUri, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`JWKS fetch failed: ${response.status}`);
  }

  return (await response.json()) as JwksDocument;
}

/**
 * Validate ID token claims (issuer, audience, expiry, nonce).
 * Signature verification requires the JWKS key — handled separately.
 */
export function validateIdTokenClaims(
  claims: OidcIdTokenClaims,
  config: OidcConfig,
  expectedNonce?: string
): { valid: true } | { valid: false; reason: string } {
  // Issuer must match
  if (claims.iss !== config.issuerUrl && claims.iss !== config.issuerUrl.replace(/\/$/, "")) {
    return { valid: false, reason: `Issuer mismatch: expected ${config.issuerUrl}, got ${claims.iss}` };
  }

  // Audience must include client ID
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(config.clientId)) {
    return { valid: false, reason: `Audience does not include client_id ${config.clientId}` };
  }

  // Token must not be expired (with 60s clock skew tolerance)
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now - 60) {
    return { valid: false, reason: "ID token has expired" };
  }

  // Token must not be issued too far in the future
  if (claims.iat > now + 60) {
    return { valid: false, reason: "ID token issued in the future" };
  }

  // Nonce validation (if provided)
  if (expectedNonce && claims.nonce !== expectedNonce) {
    return { valid: false, reason: "Nonce mismatch" };
  }

  return { valid: true };
}

// ─── State Generation ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-secure state parameter.
 * Encodes orgSlug + nonce for CSRF protection + routing.
 */
export function generateOidcState(orgSlug: string): {
  state: string;
  nonce: string;
  codeVerifier: string;
} {
  const nonce = randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const statePayload = JSON.stringify({ orgSlug, nonce, ts: Date.now() });
  const state = Buffer.from(statePayload).toString("base64url");

  return { state, nonce, codeVerifier };
}

/**
 * Parse and validate the returned state parameter.
 */
export function parseOidcState(
  state: string
): { orgSlug: string; nonce: string; ts: number } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed.orgSlug || !parsed.nonce || !parsed.ts) return null;
    // Reject states older than 10 minutes
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
