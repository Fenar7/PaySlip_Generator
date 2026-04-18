"use client";

import { useEffect, useState, useRef } from "react";
import {
  importGstr2bJson,
  runGstr2bReconcile,
  listGstr2bImports,
  getGstr2bImport,
  manuallyMatchEntry,
} from "./actions";
import type { Gstr2bMatchStatus } from "@/generated/prisma/client";

type Import = Awaited<ReturnType<typeof listGstr2bImports>>[number];
type ImportDetail = NonNullable<Awaited<ReturnType<typeof getGstr2bImport>>>;
type Entry = ImportDetail["entries"][number];

const STATUS_COLORS: Record<string, string> = {
  AUTO_MATCHED: "bg-green-100 text-green-700",
  MANUALLY_MATCHED: "bg-blue-100 text-blue-700",
  SUGGESTED: "bg-yellow-100 text-yellow-700",
  MISMATCH: "bg-red-100 text-red-600",
  NOT_IN_BOOKS: "bg-orange-100 text-orange-700",
  UNMATCHED: "bg-slate-100 text-slate-600",
};

export default function Gstr2bReconciliationPage() {
  const [imports, setImports] = useState<Import[]>([]);
  const [selected, setSelected] = useState<ImportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadImports() {
    setLoading(true);
    const data = await listGstr2bImports();
    setImports(data);
    setLoading(false);
  }

  useEffect(() => { loadImports(); }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = await importGstr2bJson(json, period);
      if (!result.success) {
        setError(result.error);
      } else {
        await loadImports();
      }
    } catch {
      setError("Invalid JSON file. Please upload a valid GSTR-2B JSON export.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleReconcile(importId: string) {
    setReconciling(true);
    setError(null);
    const result = await runGstr2bReconcile(importId);
    if (!result.success) {
      setError(result.error);
    } else {
      const detail = await getGstr2bImport(importId);
      setSelected(detail);
      await loadImports();
    }
    setReconciling(false);
  }

  async function handleSelectImport(id: string) {
    const detail = await getGstr2bImport(id);
    setSelected(detail);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">GSTR-2B Reconciliation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import your GSTR-2B JSON file and reconcile with vendor bills
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload Panel */}
      <div className="mb-6 p-5 rounded-lg border bg-white shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Import GSTR-2B File</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Period (YYYY-MM)</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">GSTR-2B JSON File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-sm"
            />
          </div>
          {uploading && <span className="text-sm text-slate-500 animate-pulse">Uploading…</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Imports list */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Imports</h2>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : imports.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No imports yet</div>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  onClick={() => handleSelectImport(imp.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                    selected?.id === imp.id
                      ? "border-blue-500 bg-blue-50"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{imp.period}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      imp.status === "RECONCILED" ? "bg-green-100 text-green-700" :
                      imp.status === "RECONCILING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {imp.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {imp.totalEntries} entries · {imp.matchedCount} matched
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Entries — {selected.period}
                </h2>
                {selected.status !== "RECONCILED" && (
                  <button
                    type="button"
                    onClick={() => handleReconcile(selected.id)}
                    disabled={reconciling}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {reconciling ? "Running…" : "Run Reconciliation"}
                  </button>
                )}
              </div>
              <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Supplier GSTIN</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Doc No.</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Date</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Taxable</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Tax</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.entries.map((entry: Entry) => (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{entry.supplierGstin}</td>
                        <td className="px-3 py-2">{entry.docNumber}</td>
                        <td className="px-3 py-2">{entry.docDate}</td>
                        <td className="px-3 py-2 text-right">₹{Number(entry.taxableAmount).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{Number(entry.totalTax).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[entry.matchStatus] ?? "bg-slate-100 text-slate-600"}`}>
                            {entry.matchStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {entry.matchConfidence != null
                            ? `${(entry.matchConfidence * 100).toFixed(0)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm border rounded-lg bg-white">
              Select an import to view entries
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
