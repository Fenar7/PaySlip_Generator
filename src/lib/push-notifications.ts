import "server-only";

import webpush from "web-push";
import { db } from "@/lib/db";

if (
  process.env.VAPID_SUBJECT &&
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function subscribe(
  userId: string,
  subscription: PushSubscriptionInput
): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    update: {
      userId,
      keys: subscription.keys,
    },
  });
}

export async function unsubscribe(
  userId: string,
  endpoint: string
): Promise<void> {
  await db.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({
    title,
    body,
    url: url ?? "/app/home",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        payload
      )
    )
  );

  // Clean up expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (
      result.status === "rejected" &&
      (result.reason as { statusCode?: number })?.statusCode === 410
    ) {
      await db.pushSubscription.delete({
        where: { id: subscriptions[i].id },
      });
    }
  }
}

export async function sendToOrg(
  orgId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const members = await db.member.findMany({
    where: { organizationId: orgId },
    select: { userId: true },
  });

  await Promise.allSettled(
    members.map((m) => sendNotification(m.userId, title, body, url))
  );
}
