import "server-only";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";

const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? "Slipwise";
const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3001";

export function getRpId(): string {
  return RP_ID;
}

export function getOrigin(): string {
  return ORIGIN;
}

export type ChallengePurpose = "registration" | "authentication";

interface StoredChallenge {
  challenge: string;
  purpose: ChallengePurpose;
  userId: string;
  expiresAt: number;
}

// In-memory challenge store. In production with multiple replicas, use Redis.
// Max 1000 entries, 5-minute expiry. Keys are `${userId}:${purpose}`.
const challengeStore = new Map<string, StoredChallenge>();
const MAX_CHALLENGES = 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function challengeKey(userId: string, purpose: ChallengePurpose): string {
  return `${userId}:${purpose}`;
}

function pruneExpiredChallenges() {
  const now = Date.now();
  for (const [key, value] of challengeStore) {
    if (value.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}

export function storeChallenge(
  userId: string,
  purpose: ChallengePurpose,
  challenge: string
): void {
  pruneExpiredChallenges();
  if (challengeStore.size >= MAX_CHALLENGES) {
    // Evict oldest entry
    const oldest = challengeStore.entries().next().value;
    if (oldest) challengeStore.delete(oldest[0]);
  }
  challengeStore.set(challengeKey(userId, purpose), {
    challenge,
    purpose,
    userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
}

export function consumeChallenge(
  userId: string,
  purpose: ChallengePurpose,
  expectedChallenge: string
): boolean {
  const key = challengeKey(userId, purpose);
  const stored = challengeStore.get(key);
  if (!stored) return false;
  challengeStore.delete(key);
  if (stored.purpose !== purpose) return false;
  if (stored.expiresAt < Date.now()) return false;
  // Constant-time comparison to avoid timing leaks
  if (stored.challenge.length !== expectedChallenge.length) return false;
  let result = 0;
  for (let i = 0; i < stored.challenge.length; i++) {
    result |= stored.challenge.charCodeAt(i) ^ expectedChallenge.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Retrieve and consume a challenge from the store.
 * Returns the challenge string on success, null on failure/expiry.
 */
export function getAndConsumeChallenge(
  userId: string,
  purpose: ChallengePurpose
): string | null {
  const key = challengeKey(userId, purpose);
  const stored = challengeStore.get(key);
  if (!stored) return null;
  challengeStore.delete(key);
  if (stored.purpose !== purpose) return null;
  if (stored.expiresAt < Date.now()) return null;
  return stored.challenge;
}

export async function createRegistrationOptions(
  userId: string,
  userEmail: string,
  existingCredentialIds: string[]
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const options: GenerateRegistrationOptionsOpts = {
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userEmail,
    attestationType: "none",
    excludeCredentials: existingCredentialIds.map((id) => ({
      id,
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: undefined,
    },
    extensions: {
      credProps: true,
    },
  };

  const opts = await generateRegistrationOptions(options);
  storeChallenge(userId, "registration", opts.challenge);
  return opts;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON
): Promise<VerifiedRegistrationResponse> {
  const expectedChallenge = getAndConsumeChallenge(userId, "registration");
  if (!expectedChallenge) {
    throw new Error("Invalid or expired registration challenge");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  });

  return verification;
}

export async function createAuthenticationOptions(
  userId: string,
  allowCredentials: { id: string; transports?: string[] }[]
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options: GenerateAuthenticationOptionsOpts = {
    rpID: RP_ID,
    allowCredentials: allowCredentials.map((c) => ({
      id: c.id,
      type: "public-key",
      transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
    })),
    userVerification: "preferred",
  };

  const opts = await generateAuthenticationOptions(options);
  storeChallenge(userId, "authentication", opts.challenge);
  return opts;
}

export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  credential: {
    credentialId: string;
    publicKey: Uint8Array;
    counter: bigint;
  }
): Promise<VerifiedAuthenticationResponse> {
  const expectedChallenge = getAndConsumeChallenge(userId, "authentication");
  if (!expectedChallenge) {
    throw new Error("Invalid or expired authentication challenge");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey as any,
      counter: Number(credential.counter),
    },
    requireUserVerification: false,
  });

  return verification;
}
