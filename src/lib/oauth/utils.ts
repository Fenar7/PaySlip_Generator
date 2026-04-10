import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateClientId(): string {
  return `slipwise_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function generateClientSecret(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

export function generateAuthCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateAccessToken(): string {
  return `sat_${crypto.randomBytes(48).toString('hex')}`;
}

export function generateRefreshToken(): string {
  return `srt_${crypto.randomBytes(48).toString('hex')}`;
}

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

export async function verifySecret(raw: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(raw, hashed);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const VALID_SCOPES = [
  'invoices:read', 'invoices:write',
  'customers:read', 'customers:write',
  'vouchers:read', 'quotes:read',
  'reports:read', 'webhooks:read', 'webhooks:write',
] as const;

export type OAuthScope = typeof VALID_SCOPES[number];

export function validateScopes(scopes: string[]): boolean {
  return scopes.every(s => (VALID_SCOPES as readonly string[]).includes(s));
}

export function validateRedirectUri(uri: string, allowedUris: string[]): boolean {
  return allowedUris.includes(uri);
}

export const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
