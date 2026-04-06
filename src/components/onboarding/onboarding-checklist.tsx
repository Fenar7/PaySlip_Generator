"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Rocket,
  X,
} from "lucide-react";

interface OnboardingStep {
  key: string;
  label: string;
  actionUrl: string;
}

interface OnboardingStatusData {
  steps: Record<string, boolean>;
  completedCount: number;
  totalSteps: number;
  percentComplete: number;
  isComplete: boolean;
  isDismissed: boolean;
}

const STEPS: OnboardingStep[] = [
  { key: "accountCreated", label: "Create account", actionUrl: "#" },
  { key: "emailVerified", label: "Verify email", actionUrl: "/app/settings" },
  {
    key: "orgSetup",
    label: "Set up organization",
    actionUrl: "/onboarding",
  },
  {
    key: "firstDocCreated",
    label: "Create your first document",
    actionUrl: "/invoice",
  },
  {
    key: "firstDocExported",
    label: "Export as PDF",
    actionUrl: "/pdf-studio",
  },
  {
    key: "teamMemberInvited",
    label: "Invite a team member",
    actionUrl: "/app/settings",
  },
  {
    key: "recurringSetup",
    label: "Set up recurring invoices",
    actionUrl: "/invoice",
  },
];

export function OnboardingChecklist({ userId }: { userId: string }) {
  const [status, setStatus] = useState<OnboardingStatusData | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/onboarding/status?userId=${encodeURIComponent(userId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.isDismissed || data.isComplete) {
          setIsVisible(false);
        }
      }
    } catch {
      // Silently fail - checklist is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDismiss = async () => {
    setIsVisible(false);
    try {
      await fetch("/api/onboarding/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch {
      // Non-critical
    }
  };

  if (isLoading || !isVisible || !status) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <Rocket className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-gray-900">
              Getting Started
            </span>
            <span className="ml-1 text-xs text-gray-500">
              {status.completedCount}/{status.totalSteps}
            </span>
            {isOpen ? (
              <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUp className="ml-auto h-4 w-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="ml-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-500"
              style={{ width: `${status.percentComplete}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {status.percentComplete}% complete
          </p>
        </div>

        {/* Steps */}
        {isOpen && (
          <div className="px-4 pb-4 pt-2">
            <ul className="space-y-2">
              {STEPS.map((step) => {
                const completed = status.steps[step.key];
                return (
                  <li key={step.key} className="flex items-center gap-3">
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                    )}
                    <span
                      className={`text-sm ${
                        completed
                          ? "text-gray-400 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {step.label}
                    </span>
                    {!completed && (
                      <a
                        href={step.actionUrl}
                        className="ml-auto text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Do it
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
