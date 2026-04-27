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
import { storeChallenge, getAndConsumeChallenge } from "./challenge-store";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(
      `Missing required environment variable: ${name}. WebAuthn is not safe to run in production without explicit RP configuration.`
    );
  }
  return value ?? "";
}

const RP_NAME = process.env.WEBAUTHN_RP_NAME || "Slipwise";
const RP_ID = getRequiredEnv("WEBAUTHN_RP_ID") || "localhost";
const ORIGIN = getRequiredEnv("WEBAUTHN_ORIGIN") || "http://localhost:3001";

export function getRpId(): string {
  return RP_ID;
}

export function getOrigin(): string {
  return ORIGIN;
}

export type ChallengePurpose = "registration" | "authentication";

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
      userVerification: "required",
      authenticatorAttachment: undefined,
    },
    extensions: {
      credProps: true,
    },
  };

  const opts = await generateRegistrationOptions(options);
  await storeChallenge(userId, "registration", opts.challenge);
  return opts;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON
): Promise<VerifiedRegistrationResponse> {
  const expectedChallenge = await getAndConsumeChallenge(userId, "registration");
  if (!expectedChallenge) {
    throw new Error("Invalid or expired registration challenge");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
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
    userVerification: "required",
  };

  const opts = await generateAuthenticationOptions(options);
  await storeChallenge(userId, "authentication", opts.challenge);
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
  const expectedChallenge = await getAndConsumeChallenge(userId, "authentication");
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
    requireUserVerification: true,
  });

  return verification;
}
