"use client";

type Properties = Record<string, unknown>;

function isPostHogConfigured(): boolean {
  return typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

async function getPostHog() {
  if (!isPostHogConfigured()) return null;
  try {
    const posthog = await import("posthog-js");
    return posthog.default;
  } catch {
    return null;
  }
}

export async function trackEvent(
  eventName: string,
  properties?: Properties
): Promise<void> {
  const posthog = await getPostHog();
  posthog?.capture(eventName, properties);
}

export async function identifyUser(
  userId: string,
  traits?: Properties
): Promise<void> {
  const posthog = await getPostHog();
  posthog?.identify(userId, traits);
}

export async function resetUser(): Promise<void> {
  const posthog = await getPostHog();
  posthog?.reset();
}
