import crypto from 'crypto';

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
    'X-Slipwise-Signature': `sha256=${signature}`,
    'X-Slipwise-Delivery': deliveryId,
    'X-Slipwise-Event': event,
    'X-Slipwise-Timestamp': String(timestamp),
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
