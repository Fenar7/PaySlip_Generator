export const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.updated",
  "invoice.deleted",
  "invoice.sent",
  "invoice.payment_received",
  "invoice.overdue",
  "customer.created",
  "customer.updated",
  "voucher.created",
  "voucher.updated",
  "voucher.deleted",
  "salary_slip.created",
  "salary_slip.updated",
  "salary_slip.deleted",
  "ping",
] as const;

export const WEBHOOK_SIGNATURE_HEADER = "X-Slipwise-Signature";
export const WEBHOOK_DELIVERY_HEADER = "X-Slipwise-Delivery";
export const WEBHOOK_EVENT_HEADER = "X-Slipwise-Event";
export const WEBHOOK_TIMESTAMP_HEADER = "X-Slipwise-Timestamp";
export const WEBHOOK_SIGNATURE_PREFIX = "sha256=";

export function isWebhookEventSubscribed(
  subscribedEvents: string[],
  eventType: string,
): boolean {
  return subscribedEvents.includes("*") || subscribedEvents.includes(eventType);
}

export function validateWebhookEvents(events: string[]): void {
  if (events.length === 0) {
    throw new Error("At least one event is required.");
  }

  const invalidEvent = events.find(
    (event) => event !== "*" && !(WEBHOOK_EVENTS as readonly string[]).includes(event),
  );
  if (invalidEvent) {
    throw new Error(`Unsupported webhook event: ${invalidEvent}`);
  }
}

export function validateWebhookUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "[::]"];
  if (blockedHosts.includes(hostname)) {
    throw new Error("Webhook URL cannot point to localhost");
  }

  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 127
    ) {
      throw new Error("Webhook URL cannot point to a private IP address");
    }
  }
}
