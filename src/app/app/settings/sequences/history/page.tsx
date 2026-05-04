"use client";

import { useEffect, useState } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { getAllSequenceSnapshots, getSequenceHistorySnapshots } from ".././actions";
import { SequenceSnapshotView } from "@/features/sequences/components/sequence-snapshot-view";
import { getCurrentSequenceState } from "@/features/sequences/services/sequence-history";
import type { SequenceSnapshotEntry, OrgSnapshotGroup } from "@/features/sequences/services/sequence-history";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SequenceHistoryBrowserPage() {
  const { activeOrg, isLoading: isOrgLoading } = useActiveOrg();

  const [groups, setGroups] = useState<OrgSnapshotGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [selectedSnapshot, setSelectedSnapshot] = useState<SequenceSnapshotEntry | null>(null);
  const [currentState, setCurrentState] = useState<Record<string, {
    name: string;
    periodicity: string;
    isActive: boolean;
    formatString: string;
    startCounter: number;
    counterPadding: number;
    totalConsumed: number;
  } | null>>({});
  const [comparingSnapshotId, setComparingSnapshotId] = useState<string | null>(null);
  const [sequenceSnapshotMap, setSequenceSnapshotMap] = useState<
    Record<string, SequenceSnapshotEntry[]>
  >({});

  useEffect(() => {
    if (!activeOrg?.id) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllSequenceSnapshots(activeOrg.id);
        setGroups(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sequence history");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeOrg?.id]);

  const toggleExpand = async (sequenceId: string) => {
    if (!activeOrg?.id) return;

    setExpandedSequences((prev) => {
      const next = new Set(prev);
      if (next.has(sequenceId)) {
        next.delete(sequenceId);
      } else {
        next.add(sequenceId);
      }
      return next;
    });

    // Load snapshots for this sequence if not already loaded
    if (!sequenceSnapshotMap[sequenceId]) {
      try {
        const snapshots = await getSequenceHistorySnapshots(activeOrg.id, sequenceId);
        const live = await getCurrentSequenceState(activeOrg.id, sequenceId);
        setSequenceSnapshotMap((prev) => ({ ...prev, [sequenceId]: snapshots }));
        setCurrentState((prev) => ({ ...prev, [sequenceId]: live }));
      } catch {
        // Silently ignore load failures for individual sequences
      }
    }
  };

  const handleCompare = (sequenceId: string) => {
    setComparingSnapshotId(
      comparingSnapshotId === sequenceId ? null : sequenceId,
    );
  };

  const docTypeLabel = (type: string) =>
    type === "INVOICE" ? "Invoices" : "Vouchers";

  if (isOrgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="h-6 w-6 animate-spin text-slate-300" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!activeOrg?.id) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Select an organization to view sequence history.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">Sequence History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse all versions of document numbering configurations across invoice and voucher sequences.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-slate-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading sequence history…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No sequences configured yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Set up document numbering in{" "}
            <a href="/app/settings/sequences" className="text-blue-600 hover:underline">
              Settings → Document Numbering
            </a>{" "}
            first.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.documentType}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                {docTypeLabel(group.documentType)}
                <span className="font-normal text-slate-400">
                  ({group.sequences.length} sequence{group.sequences.length !== 1 ? "s" : ""})
                </span>
              </h2>

              <div className="space-y-3">
                {group.sequences.map((seq) => {
                  const isExpanded = expandedSequences.has(seq.sequenceId);
                  const snapshots = sequenceSnapshotMap[seq.sequenceId] ?? [];
                  const isComparing = comparingSnapshotId === seq.sequenceId;

                  return (
                    <div
                      key={seq.sequenceId}
                      className="rounded-lg border border-slate-200 bg-white"
                    >
                      {/* Sequence header — clickable to expand */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(seq.sequenceId)}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                      >
                        <svg
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {seq.sequenceName}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0 text-xs font-medium ${
                                seq.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {seq.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {seq.snapshotCount} version{seq.snapshotCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>

                      {/* Expanded version list */}
                      {isExpanded && (
                        <div className="border-t border-slate-100">
                          {snapshots.length === 0 ? (
                            <div className="px-5 py-6 text-center text-xs text-slate-400">
                              No versions recorded yet.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-50">
                              {snapshots.map((snap, index) => {
                                const isSelected = selectedSnapshot?.id === snap.id;
                                const isCurrent = index === 0;

                                return (
                                  <div key={snap.id}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedSnapshot(isSelected ? null : snap)
                                      }
                                      className={`flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-slate-50 ${
                                        isSelected ? "bg-blue-50/50" : ""
                                      }`}
                                    >
                                      <span className="w-8 text-xs font-semibold text-slate-600">
                                        v{snap.version}
                                      </span>
                                      <span
                                        className={`inline-flex items-center rounded-full px-1.5 py-0 text-xs font-medium ${CHANGE_TYPE_COLORS[snap.changeType] ?? "bg-slate-100 text-slate-600"}`}
                                      >
                                        {CHANGE_TYPE_LABELS[snap.changeType] ?? snap.changeType}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {formatDate(snap.createdAt)}
                                      </span>
                                      {isCurrent && (
                                        <span className="ml-auto rounded bg-slate-100 px-1.5 py-0 text-xs text-slate-500">
                                          current
                                        </span>
                                      )}
                                    </button>

                                    {/* Snapshot detail */}
                                    {isSelected && (
                                      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                                        <div className="mb-3 flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleCompare(seq.sequenceId)}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                          >
                                            {isComparing
                                              ? "Hide comparison"
                                              : "Compare with current config"}
                                          </button>
                                        </div>
                                        <SequenceSnapshotView
                                          snapshot={snap}
                                          current={isComparing ? currentState[seq.sequenceId] ?? null : null}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
