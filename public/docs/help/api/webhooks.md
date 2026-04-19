# Webhook Configuration

## Overview

Webhooks allow Slipwise to notify your systems in real-time when events occur. Configure endpoints in **Settings → Developer → Webhooks**.

## Setting Up a Webhook

1. Navigate to Settings → Developer → Webhooks
2. Click "Add Endpoint"
3. Enter your endpoint URL (must be HTTPS)
4. Select the events you want to receive
5. Save — you'll receive a signing secret

## Verifying Webhook Signatures

Every webhook request includes an `X-Slipwise-Signature` header. Verify it using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

## Retry Policy

Failed deliveries (non-2xx response or timeout) are retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 30 seconds
- Attempt 3: 2 minutes
- Attempt 4: 10 minutes
- Attempt 5: 1 hour

After 5 failed attempts, the delivery is moved to the Dead Letter Queue. You can manually retry from the webhook dashboard.

## Event Types

| Event | Description |
|-------|-------------|
| `invoice.created` | New invoice created |
| `invoice.sent` | Invoice emailed to customer |
| `invoice.paid` | Payment received |
| `invoice.overdue` | Invoice past due date |
| `payment.received` | Payment recorded |
| `payment.failed` | Payment attempt failed |
| `customer.created` | New customer added |
| `subscription.renewed` | Subscription renewed |
| `subscription.canceled` | Subscription canceled |
