"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllRead } from "./actions";

// ─── Notification Type Icons ──────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  proof_uploaded: "📎",
  ticket_opened: "🎫",
  ticket_reply: "💬",
  approval_requested: "✋",
  approval_approved: "✅",
  approval_rejected: "❌",
  invoice_overdue: "⚠️",
};

function getIcon(type: string): string {
  return TYPE_ICONS[type] ?? "🔔";
}

// ─── Relative Time ────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Mark All Read Button ─────────────────────────────────────────────────────

export function MarkAllReadButton({ hasUnread }: { hasUnread: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!hasUnread) return null;

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await markAllRead();
          router.refresh();
        })
      }
      disabled={isPending}
      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {isPending ? "Marking…" : "Mark All as Read"}
    </button>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function NotificationItem({
  id,
  type,
  title,
  body,
  link,
  isRead,
  createdAt,
}: NotificationItemProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      if (!isRead) {
        await markNotificationRead(id);
      }
      if (link) {
        router.push(link);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex w-full items-start gap-4 rounded-lg p-4 text-left transition-colors ${
        isRead
          ? "bg-slate-50 hover:bg-slate-100"
          : "border-l-4 border-blue-500 bg-white hover:bg-blue-50"
      } ${isPending ? "opacity-50" : ""}`}
    >
      <span className="mt-0.5 text-xl">{getIcon(type)}</span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            isRead ? "font-normal text-slate-700" : "font-semibold text-slate-900"
          }`}
        >
          {title}
        </p>
        <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{body}</p>
        <p className="mt-1 text-xs text-slate-400">{relativeTime(createdAt)}</p>
      </div>
      {!isRead && (
        <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  );
}
