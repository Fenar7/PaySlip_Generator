"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  processPayrollRun,
  updatePayrollItem,
  moveToReview,
  finalizePayrollRun,
} from "./actions";

interface RunSummary {
  id: string;
  period: string;
  status: string;
  totalNetPay: number;
  totalGross: number;
  createdAt: Date;
  finalizedAt: Date | null;
  _count: { runItems: number };
}

interface RunItem {
  id: string;
  employeeId: string;
  employeeName: string;
  attendedDays: number;
  lossOfPayDays: number;
  grossPay: number;
  basicPay: number;
  hra: number;
  specialAllowance: number;
  pfEmployee: number;
  esiEmployee: number;
  tdsDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  otherEarnings: number;
  totalDeductions: number;
  netPay: number;
  pfEmployer: number;
  esiEmployer: number;
  status: string;
  holdReason: string | null;
  salarySlipId: string | null;
}

interface RunDetail {
  id: string;
  period: string;
  status: string;
  workingDays: number;
  totalGross: number;
  totalDeductions: number;
  totalNetPay: number;
  totalPfEmployer: number;
  totalEsiEmployer: number;
  createdAt: Date;
  finalizedAt: Date | null;
  runItems: RunItem[];
}

const STATUS_BADGE: Record<string, "default" | "warning" | "success" | "danger"> = {
  DRAFT: "default",
  PROCESSING: "warning",
  REVIEW: "warning",
  FINALIZED: "success",
  CANCELLED: "danger",
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    attendedDays: number;
    lossOfPayDays: number;
    otherEarnings: number;
    otherDeductions: number;
    holdReason: string;
  } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPeriod, setNewPeriod] = useState(getCurrentPeriod());
  const [newWorkingDays, setNewWorkingDays] = useState(26);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadRuns() {
    const result = await listPayrollRuns();
    if (result.success) setRuns(result.data);
  }

  async function loadRunDetail(runId: string) {
    const result = await getPayrollRun(runId);
    if (result.success) setSelectedRun(result.data);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  function handleCreateRun() {
    setError(null);
    startTransition(async () => {
      const result = await createPayrollRun({
        period: newPeriod,
        workingDays: newWorkingDays,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setShowCreateModal(false);
      await loadRuns();
      await loadRunDetail(result.data.id);
    });
  }

  function handleProcessRun(runId: string) {
    setError(null);
    startTransition(async () => {
      const result = await processPayrollRun(runId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await loadRuns();
      await loadRunDetail(runId);
    });
  }

  function handleMoveToReview(runId: string) {
    setError(null);
    startTransition(async () => {
      const result = await moveToReview(runId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await loadRuns();
      await loadRunDetail(runId);
    });
  }

  function handleFinalizeRun(runId: string) {
    if (!confirm("Finalize this run? Salary slips will be generated for all employees. This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await finalizePayrollRun(runId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await loadRuns();
      await loadRunDetail(runId);
    });
  }

  function startEditItem(item: RunDetail["runItems"][number]) {
    setEditingItemId(item.id);
    setEditValues({
      attendedDays: item.attendedDays,
      lossOfPayDays: item.lossOfPayDays,
      otherEarnings: item.otherEarnings,
      otherDeductions: item.otherDeductions,
      holdReason: item.holdReason ?? "",
    });
  }

  function handleSaveItem(itemId: string) {
    if (!editValues) return;
    setError(null);
    startTransition(async () => {
      const result = await updatePayrollItem({
        itemId,
        attendedDays: editValues.attendedDays,
        lossOfPayDays: editValues.lossOfPayDays,
        otherEarnings: editValues.otherEarnings,
        otherDeductions: editValues.otherDeductions,
        holdReason: editValues.holdReason || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditingItemId(null);
      if (selectedRun) await loadRunDetail(selectedRun.id);
    });
  }

  function handleDownloadRegister(runId: string) {
    window.open(`/api/payroll/runs/${runId}/register`, "_blank");
  }

  const statusFlow: Record<string, { label: string; action: (id: string) => void } | null> = {
    DRAFT: { label: "Compute Salaries", action: handleProcessRun },
    PROCESSING: { label: "Move to Review", action: handleMoveToReview },
    REVIEW: { label: "Finalize & Generate Slips", action: handleFinalizeRun },
    FINALIZED: null,
    CANCELLED: null,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Payroll Runs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage monthly salary processing and generate pay registers
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          disabled={isPending}
        >
          + New Run
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Run list */}
        <div className="col-span-4 space-y-2">
          {runs.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-8">
              No payroll runs yet
            </p>
          )}
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => loadRunDetail(run.id)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selectedRun?.id === run.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{run.period}</span>
                <Badge variant={STATUS_BADGE[run.status] ?? "default"}>
                  {run.status}
                </Badge>
              </div>
              <div className="text-xs text-zinc-500">
                {run._count.runItems} employees · Net {fmt(run.totalNetPay)}
              </div>
            </button>
          ))}
        </div>

        {/* Run detail */}
        <div className="col-span-8">
          {!selectedRun ? (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg">
              Select a payroll run to view details
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Gross Pay", value: fmt(selectedRun.totalGross) },
                  { label: "Total Deductions", value: fmt(selectedRun.totalDeductions) },
                  { label: "Net Pay", value: fmt(selectedRun.totalNetPay) },
                  { label: "Employer Contribution", value: fmt(selectedRun.totalPfEmployer + selectedRun.totalEsiEmployer) },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3"
                  >
                    <div className="text-xs text-zinc-500 mb-1">{card.label}</div>
                    <div className="text-lg font-semibold">{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Action button */}
              <div className="flex items-center gap-3">
                {statusFlow[selectedRun.status] && (
                  <Button
                    variant="primary"
                    onClick={() => statusFlow[selectedRun.status]!.action(selectedRun.id)}
                    disabled={isPending}
                  >
                    {isPending ? "Processing…" : statusFlow[selectedRun.status]!.label}
                  </Button>
                )}
                {selectedRun.status === "FINALIZED" && (
                  <Button
                    variant="secondary"
                    onClick={() => handleDownloadRegister(selectedRun.id)}
                  >
                    Download Pay Register (XLSX)
                  </Button>
                )}
              </div>

              {/* Employee table */}
              {selectedRun.runItems.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-zinc-600">Employee</th>
                        <th className="text-right px-3 py-2 font-medium text-zinc-600">Days</th>
                        <th className="text-right px-3 py-2 font-medium text-zinc-600">Gross</th>
                        <th className="text-right px-3 py-2 font-medium text-zinc-600">Deductions</th>
                        <th className="text-right px-3 py-2 font-medium text-zinc-600">Net Pay</th>
                        <th className="text-center px-3 py-2 font-medium text-zinc-600">Status</th>
                        {selectedRun.status !== "FINALIZED" && (
                          <th className="px-3 py-2" />
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {selectedRun.runItems.map((item) => (
                        <tr key={item.id} className="bg-white dark:bg-zinc-900">
                          {editingItemId === item.id && editValues ? (
                            <>
                              <td className="px-3 py-2">{item.employeeName}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1 text-xs">
                                  <input
                                    type="number"
                                    value={editValues.attendedDays}
                                    onChange={(e) =>
                                      setEditValues({
                                        ...editValues,
                                        attendedDays: Number(e.target.value),
                                      })
                                    }
                                    className="w-14 border rounded px-1 py-0.5"
                                    min={0}
                                    max={selectedRun.workingDays}
                                  />
                                  <span>/ {selectedRun.workingDays}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">—</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  value={editValues.otherDeductions}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      otherDeductions: Number(e.target.value),
                                    })
                                  }
                                  className="w-20 border rounded px-1 py-0.5 text-right text-xs"
                                  min={0}
                                  placeholder="Other ded."
                                />
                              </td>
                              <td className="px-3 py-2 text-right">—</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editValues.holdReason}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      holdReason: e.target.value,
                                    })
                                  }
                                  className="w-24 border rounded px-1 py-0.5 text-xs"
                                  placeholder="Hold reason"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant="primary"
                                    onClick={() => handleSaveItem(item.id)}
                                    disabled={isPending}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => setEditingItemId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 font-medium">
                                {item.employeeName}
                                {item.holdReason && (
                                  <div className="text-xs text-amber-600">
                                    Hold: {item.holdReason}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {item.attendedDays}
                                {item.lossOfPayDays > 0 && (
                                  <span className="text-red-500 ml-1">
                                    (-{item.lossOfPayDays})
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">{fmt(item.grossPay)}</td>
                              <td className="px-3 py-2 text-right">{fmt(item.totalDeductions)}</td>
                              <td className="px-3 py-2 text-right font-medium">{fmt(item.netPay)}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge
                                  variant={
                                    item.status === "finalized"
                                      ? "success"
                                      : item.status === "on_hold"
                                      ? "warning"
                                      : "default"
                                  }
                                >
                                  {item.status}
                                </Badge>
                              </td>
                              {selectedRun.status !== "FINALIZED" && (
                                <td className="px-3 py-2">
                                  <Button
                                    variant="ghost"
                                    onClick={() => startEditItem(item)}
                                  >
                                    Edit
                                  </Button>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">New Payroll Run</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Period (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Working Days
                </label>
                <input
                  type="number"
                  value={newWorkingDays}
                  onChange={(e) => setNewWorkingDays(Number(e.target.value))}
                  min={1}
                  max={31}
                  className="w-full border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleCreateRun}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? "Creating…" : "Create Run"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
