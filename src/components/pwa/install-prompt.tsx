"use client";

import { useState, useEffect, useCallback } from "react";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const handleBeforeInstall = useCallback((e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);

    const visits = parseInt(localStorage.getItem("slipwise_visits") ?? "0", 10);
    const newVisits = visits + 1;
    localStorage.setItem("slipwise_visits", String(newVisits));

    if (
      newVisits >= 3 &&
      !localStorage.getItem("slipwise_install_dismissed")
    ) {
      setShowPrompt(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [handleBeforeInstall]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem("slipwise_install_dismissed", "true");
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-[var(--border-strong)] bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1a1a1a]">
            Install Slipwise on your phone
          </p>
          <p className="mt-1 text-xs text-[#666]">
            Get quick access with an app-like experience.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#999] hover:text-[#1a1a1a]"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c]"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-4 py-2 text-sm text-[#666] hover:bg-gray-100"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
