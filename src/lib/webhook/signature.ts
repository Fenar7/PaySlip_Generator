import crypto from 'crypto';
import {
  WEBHOOK_DELIVERY_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_SIGNATURE_PREFIX,
  WEBHOOK_TIMESTAMP_HEADER,
} from './constants';

export function generateWebhookSignature(signingSecret: string, body: string, timestamp: number): string {
  const payload = `${timestamp}.${body}`;
  return crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
}

export function generateSignatureHeaders(
  signingSecret: string,
  body: string,
  deliveryId: string,
  event: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateWebhookSignature(signingSecret, body, timestamp);
  return {
    [WEBHOOK_SIGNATURE_HEADER]: `${WEBHOOK_SIGNATURE_PREFIX}${signature}`,
    [WEBHOOK_DELIVERY_HEADER]: deliveryId,
    [WEBHOOK_EVENT_HEADER]: event,
    [WEBHOOK_TIMESTAMP_HEADER]: String(timestamp),
  };
}

export function verifyWebhookSignature(
  signingSecret: string,
  body: string,
  timestamp: number,
  signature: string,
): boolean {
  const expected = generateWebhookSignature(signingSecret, body, timestamp);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function generateSigningSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}
