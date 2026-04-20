"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getAuditIntegrityData,
  verifyChainAction,
  exportAuditPackageAction,
} from "./actions";
import type { AuditIntegrityDashboardData } from "./actions";

export function IntegrityDashboard() {
  const [data, setData] = useState<AuditIntegrityDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await getAuditIntegrityData();
      if (cancelled) return;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleVerify() {
    startTransition(async () => {
      setVerifyResult(null);
      const res = await verifyChainAction();
      if (res.success) {
        setVerifyResult(
          `Chain ${res.data.status}: ${res.data.verified}/${res.data.totalEntries} entries verified in ${res.data.durationMs}ms` +
            (res.data.gapsDetected.length > 0 ? ` (${res.data.gapsDetected.length} gaps)` : ""),
        );
        // Refresh dashboard
        const refreshed = await getAuditIntegrityData();
        if (refreshed.success) setData(refreshed.data);
      } else {
        setVerifyResult(`Error: ${res.error}`);
      }
    });
  }

  function handleExport() {
    startTransition(async () => {
      setExportMsg(null);
      const end = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);

      const res = await exportAuditPackageAction(start.toISOString(), end.toISOString());
      if (res.success) {
        // Trigger download
        const binary = atob(res.data.base64Zip);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-package-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportMsg(
          `Exported ${res.data.entryCount} entries. Chain: ${res.data.chainIntact ? "INTACT" : "BROKEN"}`,
        );
        // Refresh
        const refreshed = await getAuditIntegrityData();
        if (refreshed.success) setData(refreshed.data);
      } else {
        setExportMsg(`Error: ${res.error}`);
      }
    });
  }

  if (error) {
    return <div className="text-destructive bg-destructive/10 rounded-lg p-4">{error}</div>;
  }
  if (!data) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  const statusColor =
    data.latestVerification?.status === "INTACT"
      ? "text-green-600"
      : data.latestVerification?.status === "BROKEN"
        ? "text-red-600"
        : "text-yellow-600";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Chained Entries</div>
          <div className="text-2xl font-bold">{data.totalChainedEntries.toLocaleString()}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Unchained (Legacy)</div>
          <div className="text-2xl font-bold">{data.totalUnchainedEntries.toLocaleString()}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Chain Status</div>
          <div className={`text-2xl font-bold ${statusColor}`}>
            {data.latestVerification?.status ?? "NEVER VERIFIED"}
          </div>
        </div>
      </div>

      {/* Last Verification */}
      {data.latestVerification && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Last Verification</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Verified:</span>{" "}
              {data.latestVerification.verifiedEntries}/{data.latestVerification.totalEntries}
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>{" "}
              {data.latestVerification.durationMs}ms
            </div>
            <div>
              <span className="text-muted-foreground">Gaps:</span>{" "}
              {data.latestVerification.gapsDetected.length}
            </div>
            <div>
              <span className="text-muted-foreground">By:</span>{" "}
              {data.latestVerification.triggeredBy}
            </div>
          </div>
          {data.latestVerification.status === "BROKEN" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <div className="font-medium">Chain broken</div>
              <div className="mt-1">
                {data.latestVerification.firstBreakSeq
                  ? `First break at sequence ${data.latestVerification.firstBreakSeq}.`
                  : "The verifier detected a chain inconsistency."}
              </div>
              {data.latestVerification.firstBreakHash && (
                <div className="mt-1 break-all font-mono text-xs">
                  Stored hash: {data.latestVerification.firstBreakHash}
                </div>
              )}
              {data.latestVerification.gapsDetected.length > 0 && (
                <div className="mt-1">
                  Missing sequence numbers:{" "}
                  {data.latestVerification.gapsDetected.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleVerify}
          disabled={isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Verifying…" : "Verify Chain Now"}
        </button>
        <button
          onClick={handleExport}
          disabled={isPending}
          className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "Exporting…" : "Export Audit Package (Last 12 months)"}
        </button>
      </div>

      {verifyResult && (
        <div className="bg-muted rounded-lg p-3 text-sm font-mono">{verifyResult}</div>
      )}
      {exportMsg && (
        <div className="bg-muted rounded-lg p-3 text-sm">{exportMsg}</div>
      )}

      {/* Recent Exports */}
      {data.recentExports.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Recent Exports</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Date Range</th>
                  <th className="pb-2">Entries</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Exported</th>
                </tr>
              </thead>
              <tbody>
                {data.recentExports.map((exp) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="py-2">
                      {new Date(exp.dateRangeStart).toLocaleDateString()} –{" "}
                      {new Date(exp.dateRangeEnd).toLocaleDateString()}
                    </td>
                    <td className="py-2">{exp.entryCount}</td>
                    <td className="py-2">{exp.status}</td>
                    <td className="py-2">{new Date(exp.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
