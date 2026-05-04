"use client";

import { useEffect, useState, useCallback } from "react";
import { SequenceSnapshotView } from "./sequence-snapshot-view";
import type { SequenceSnapshotEntry } from "../services/sequence-history";
import { getSequenceSnapshots, getCurrentSequenceState } from "../services/sequence-history";

const CHANGE_TYPE_LABELS: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DEACTIVATED: "Deactivated",
  REACTIVATED: "Reactivated",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  CREATED: "bg-green-100 text-green-700",
  UPDATED: "bg-blue-100 text-blue-700",
  DEACTIVATED: "bg-slate-100 text-slate-600",
  REACTIVATED: "bg-emerald-100 text-emerald-700",
};

interface SequenceHistoryPanelProps {
  orgId: string;
  sequenceId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SequenceHistoryPanel({ orgId, sequenceId }: SequenceHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<SequenceSnapshotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<{
    name: string;
    periodicity: string;
    isActive: boolean;
    formatString: string;
    startCounter: number;
    counterPadding: number;
    totalConsumed: number;
  } | null>(null);
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, live] = await Promise.all([
        getSequenceSnapshots(orgId, sequenceId),
        getCurrentSequenceState(orgId, sequenceId),
      ]);
      setSnapshots(data);
      setCurrentState(live);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [orgId, sequenceId, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">
        No version history recorded yet. Changes made from this point forward will be tracked.
      </div>
    );
  }

  const selected = snapshots.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Timeline sidebar */}
      <div className="space-y-1">
        {snapshots.map((snap, index) => (
          <button
            key={snap.id}
            type="button"
            onClick={() => setSelectedId(snap.id)}
            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
              snap.id === selectedId
                ? "bg-blue-50 ring-1 ring-blue-200"
                : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">v{snap.version}</span>
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0 text-xs font-medium ${CHANGE_TYPE_COLORS[snap.changeType] ?? "bg-slate-100 text-slate-600"}`}
              >
                {CHANGE_TYPE_LABELS[snap.changeType] ?? snap.changeType}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{formatDate(snap.createdAt)}</p>
            {index < snapshots.length - 1 && (
              <div className="ml-[11px] mt-1 h-3 w-px bg-slate-200" />
            )}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div>
        {selected && (
          <div className="space-y-4">
            {!comparing && (
              <button
                type="button"
                onClick={() => setComparing(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Compare with current config
              </button>
            )}
            {comparing && (
              <button
                type="button"
                onClick={() => setComparing(false)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Hide comparison
              </button>
            )}
            <SequenceSnapshotView
              snapshot={selected}
              current={comparing ? currentState : null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
