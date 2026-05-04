"use client";

import { useMemo, useState, useCallback } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { getAllSequenceSnapshots, getSequenceHistorySnapshots } from ".././actions";
import { SequenceSnapshotView } from "@/features/sequences/components/sequence-snapshot-view";
import { getCurrentSequenceState } from "@/features/sequences/services/sequence-history";
import type { SequenceSnapshotEntry, OrgSnapshotGroup } from "@/features/sequences/services/sequence-history";
import Link from "next/link";

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
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SequenceHistoryBrowserPage() {
  const { activeOrg, isLoading: isOrgLoading } = useActiveOrg();

  const [groups, setGroups] = useState<OrgSnapshotGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAll, setExpandedAll] = useState(false);
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [selectedSnapshot, setSelectedSnapshot] = useState<{ id: string; sequenceId: string } | null>(null);
  const [sequenceSnapshotMap, setSequenceSnapshotMap] = useState<Record<string, SequenceSnapshotEntry[]>>({});
  const [currentStates, setCurrentStates] = useState<Record<string, {
    name: string; periodicity: string; isActive: boolean;
    formatString: string; startCounter: number; counterPadding: number; totalConsumed: number;
  } | null>>({});
  const [comparingIds, setComparingIds] = useState<Set<string>>(new Set());
  const [snapshotsLoading, setSnapshotsLoading] = useState<Set<string>>(new Set());

  // ─── Load overview ───
  useMemo(() => {
    if (!activeOrg?.id) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllSequenceSnapshots(activeOrg.id);
        setGroups(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeOrg?.id]);

  // ─── Expand sequence and load its snapshots ───
  const toggleSequence = useCallback(
    async (sequenceId: string) => {
      if (!activeOrg?.id) return;

      setExpandedSequences((prev) => {
        const next = new Set(prev);
        if (next.has(sequenceId)) {
          next.delete(sequenceId);
          setExpandedAll(false);
        } else {
          next.add(sequenceId);
        }
        return next;
      });

      if (!sequenceSnapshotMap[sequenceId]) {
        setSnapshotsLoading((prev) => new Set(prev).add(sequenceId));
        try {
          const [snaps, live] = await Promise.all([
            getSequenceHistorySnapshots(activeOrg.id, sequenceId),
            getCurrentSequenceState(activeOrg.id, sequenceId),
          ]);
          setSequenceSnapshotMap((prev) => ({ ...prev, [sequenceId]: snaps }));
          setCurrentStates((prev) => ({ ...prev, [sequenceId]: live }));
        } catch {
          // ignore per-sequence load failures
        } finally {
          setSnapshotsLoading((prev) => {
            const next = new Set(prev);
            next.delete(sequenceId);
            return next;
          });
        }
      }
    },
    [activeOrg?.id, sequenceSnapshotMap],
  );

  // ─── Expand / collapse all ───
  const toggleAll = useCallback(async () => {
    if (!activeOrg?.id || groups.length === 0) return;

    if (expandedAll) {
      setExpandedSequences(new Set());
      setExpandedAll(false);
    } else {
      const allIds = groups.flatMap((g) => g.sequences.map((s) => s.sequenceId));
      setExpandedSequences(new Set(allIds));
      setExpandedAll(true);

      for (const id of allIds) {
        if (!sequenceSnapshotMap[id]) {
          try {
            const [snaps, live] = await Promise.all([
              getSequenceHistorySnapshots(activeOrg.id, id),
              getCurrentSequenceState(activeOrg.id, id),
            ]);
            setSequenceSnapshotMap((prev) => ({ ...prev, [id]: snaps }));
            setCurrentStates((prev) => ({ ...prev, [id]: live }));
          } catch {
            // ignore
          }
        }
      }
    }
  }, [activeOrg?.id, expandedAll, groups, sequenceSnapshotMap]);

  // ─── Derive stats ───
  const stats = useMemo(() => {
    let totalSequences = 0;
    let totalVersions = 0;
    let totalDocuments = 0;
    let activeCount = 0;
    for (const g of groups) {
      for (const s of g.sequences) {
        totalSequences++;
        totalVersions += s.snapshotCount;
        totalDocuments += s.documentCount;
        if (s.isActive) activeCount++;
      }
    }
    return { totalSequences, totalVersions, totalDocuments, activeCount };
  }, [groups]);

  const docTypeLabel = (type: string) => (type === "INVOICE" ? "Invoices" : "Vouchers");
  const vaultHref = (type: string) =>
    type === "INVOICE" ? "/app/docs/invoices" : "/app/docs/vouchers";

  // ─── Loading ───
  if (isOrgLoading || (loading && groups.length === 0)) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900">Sequence History</h1>
        </div>
        <div className="flex items-center gap-2 py-12 text-sm text-slate-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  if (!activeOrg?.id) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center text-sm text-slate-400">
        Select an organization to view sequence history.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Sequence History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track every change to your document numbering configurations. Each mutation creates an immutable version.
        </p>
      </div>

      {/* ── Stats bar ── */}
      {!loading && groups.length > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Sequences", value: stats.totalSequences },
            { label: "Active", value: stats.activeCount },
            { label: "Versions", value: stats.totalVersions },
            { label: "Documents", value: stats.totalDocuments },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Expand/Collapse all ── */}
      {groups.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {groups.flatMap((g) => g.sequences).length} sequences ·{" "}
            {groups.reduce((sum, g) => sum + g.sequences.reduce((s, seq) => s + seq.snapshotCount, 0), 0)}{" "}
            versions
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {expandedAll ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && groups.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No sequences configured yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Set up document numbering in{" "}
            <Link href="/app/settings/sequences" className="text-blue-600 hover:underline">
              Settings → Document Numbering
            </Link>{" "}
            first.
          </p>
        </div>
      )}

      {/* ── Folder Tree ── */}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.documentType}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700">
                {docTypeLabel(group.documentType)}
              </h2>
              <span className="text-xs text-slate-400">
                {group.sequences.length} sequence{group.sequences.length !== 1 ? "s" : ""}
              </span>
              <Link
                href={vaultHref(group.documentType)}
                className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View {docTypeLabel(group.documentType).toLowerCase()} vault →
              </Link>
            </div>

            <div className="space-y-2">
              {group.sequences.map((seq) => {
                const isExpanded = expandedSequences.has(seq.sequenceId);
                const snapshots = sequenceSnapshotMap[seq.sequenceId] ?? [];
                const isLoadingSnaps = snapshotsLoading.has(seq.sequenceId);
                const isComparing = comparingIds.has(seq.sequenceId);

                return (
                  <div
                    key={seq.sequenceId}
                    className="rounded-lg border border-slate-200 bg-white"
                  >
                    {/* Sequence header */}
                    <button
                      type="button"
                      onClick={() => toggleSequence(seq.sequenceId)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                    >
                      <svg
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {seq.sequenceName}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0 text-xs font-medium ${
                              seq.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {seq.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                          <span>{seq.snapshotCount} version{seq.snapshotCount !== 1 ? "s" : ""}</span>
                          {seq.formatString && (
                            <span className="font-mono text-[11px]">{seq.formatString}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 text-right">
                        {seq.nextPreview && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                            {seq.nextPreview}
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-600">
                          {seq.documentCount.toLocaleString()} doc{seq.documentCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>

                    {/* Expanded version list */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        {isLoadingSnaps ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400">
                            Loading versions…
                          </div>
                        ) : snapshots.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400">
                            No versions recorded yet.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {snapshots.map((snap, index) => {
                              const isSel = selectedSnapshot?.id === snap.id;
                              return (
                                <div key={snap.id}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSnapshot(
                                        isSel ? null : { id: snap.id, sequenceId: seq.sequenceId },
                                      )
                                    }
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 ${
                                      isSel ? "bg-blue-50/50" : ""
                                    }`}
                                  >
                                    <span className="w-7 text-xs font-semibold text-slate-500">
                                      v{snap.version}
                                    </span>
                                    <span
                                      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0 text-xs font-medium ${CHANGE_TYPE_COLORS[snap.changeType] ?? "bg-slate-100 text-slate-600"}`}
                                    >
                                      {CHANGE_TYPE_LABELS[snap.changeType] ?? snap.changeType}
                                    </span>
                                    <span className="flex-1 text-xs text-slate-400">
                                      {formatDate(snap.createdAt)}
                                      {snap.changedBy && ` — ${snap.changedBy.name}`}
                                    </span>
                                    {index === 0 && (
                                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0 text-[11px] text-slate-500">
                                        current
                                      </span>
                                    )}
                                  </button>

                                  {isSel && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setComparingIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(seq.sequenceId)) next.delete(seq.sequenceId);
                                            else next.add(seq.sequenceId);
                                            return next;
                                          })
                                        }
                                        className="mb-3 text-xs font-medium text-blue-600 hover:text-blue-800"
                                      >
                                        {isComparing ? "Hide comparison" : "Compare with current config"}
                                      </button>
                                      <SequenceSnapshotView
                                        snapshot={snap}
                                        current={isComparing ? (currentStates[seq.sequenceId] ?? null) : null}
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
    </div>
  );
}
