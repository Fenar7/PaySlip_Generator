"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const DISMISS_KEY = "slipwise_passkey_adoption_dismissed";
const DISMISS_EVENT = "slipwise-passkey-adoption-dismissed";

interface PasskeyAdoptionPromptProps {
  show: boolean;
}

export function PasskeyAdoptionPrompt({ show }: PasskeyAdoptionPromptProps) {
  const dismissed = useSyncExternalStore(
    subscribeToDismissal,
    getDismissedSnapshot,
    getServerDismissedSnapshot
  );

  if (!show || dismissed) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "true");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Add a passkey for secure second-step verification</p>
          <p className="mt-1 text-sm text-slate-600">
            Use Face ID, Touch ID, Windows Hello, Android fingerprint, or a security key after sign-in.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/app/settings/security"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Add passkey
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-100 hover:text-slate-900"
            aria-label="Dismiss passkey prompt"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

function getDismissedSnapshot(): boolean {
  return window.localStorage.getItem(DISMISS_KEY) === "true";
}

function getServerDismissedSnapshot(): boolean {
  return false;
}

function subscribeToDismissal(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DISMISS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DISMISS_EVENT, onStoreChange);
  };
}
