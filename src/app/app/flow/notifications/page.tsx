import type { Metadata } from "next";
import Link from "next/link";
import { listNotifications } from "./actions";
import { MarkAllReadButton, NotificationItem } from "./notifications-client";

export const metadata: Metadata = { title: "Notifications | Slipwise" };

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "0", 10);

  const result = await listNotifications({ page });

  if (!result.success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">Error: {result.error}</p>
        </div>
      </div>
    );
  }

  const { notifications, total, unreadCount } = result.data;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <MarkAllReadButton hasUnread={unreadCount > 0} />
        </div>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mb-3 text-4xl">🔔</div>
            <h3 className="text-lg font-semibold text-slate-900">
              No notifications yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ll see notifications here when there are updates.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                id={n.id}
                type={n.type}
                title={n.title}
                body={n.body}
                link={n.link}
                isRead={n.isRead}
                createdAt={n.createdAt}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 0 && (
                <Link
                  href={`/app/flow/notifications?page=${page - 1}`}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages - 1 && (
                <Link
                  href={`/app/flow/notifications?page=${page + 1}`}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
