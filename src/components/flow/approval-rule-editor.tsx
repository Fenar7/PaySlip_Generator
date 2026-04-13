"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronUp, ChevronDown, Plus, Pencil, X, Check } from "lucide-react";
import {
  addApprovalPolicyRule,
  updateApprovalPolicyRule,
  removeApprovalPolicyRule,
  reorderApprovalPolicyRules,
} from "@/app/app/flow/policies/actions";

type ApprovalPolicyRule = {
  id: string;
  policyId: string;
  sequence: number;
  minAmount: string | number | null;
  maxAmount: string | number | null;
  approverRole: string | null;
  approverUserId: string | null;
  fallbackRole: string | null;
  fallbackUserId: string | null;
};

type Props = {
  policyId: string;
  rules: ApprovalPolicyRule[];
};

type RuleFormState = {
  minAmount: string;
  maxAmount: string;
  approverRole: string;
  approverUserId: string;
  fallbackRole: string;
  fallbackUserId: string;
};

const EMPTY_FORM: RuleFormState = {
  minAmount: "",
  maxAmount: "",
  approverRole: "",
  approverUserId: "",
  fallbackRole: "",
  fallbackUserId: "",
};

function ruleToForm(rule: ApprovalPolicyRule): RuleFormState {
  return {
    minAmount: rule.minAmount != null ? String(rule.minAmount) : "",
    maxAmount: rule.maxAmount != null ? String(rule.maxAmount) : "",
    approverRole: rule.approverRole ?? "",
    approverUserId: rule.approverUserId ?? "",
    fallbackRole: rule.fallbackRole ?? "",
    fallbackUserId: rule.fallbackUserId ?? "",
  };
}

function validateForm(form: RuleFormState): string | null {
  if (!form.approverRole.trim() && !form.approverUserId.trim()) {
    return "At least one of Approver Role or Approver User ID is required";
  }
  const min = form.minAmount ? parseFloat(form.minAmount) : null;
  const max = form.maxAmount ? parseFloat(form.maxAmount) : null;
  if (min !== null && max !== null && min >= max) {
    return "Min Amount must be less than Max Amount";
  }
  return null;
}

function formToInput(form: RuleFormState) {
  return {
    minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined,
    maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : undefined,
    approverRole: form.approverRole.trim() || undefined,
    approverUserId: form.approverUserId.trim() || undefined,
    fallbackRole: form.fallbackRole.trim() || undefined,
    fallbackUserId: form.fallbackUserId.trim() || undefined,
  };
}

function RuleFormFields({
  form,
  onChange,
}: {
  form: RuleFormState;
  onChange: (field: keyof RuleFormState, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Min Amount</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.minAmount}
          onChange={(e) => onChange("minAmount", e.target.value)}
          placeholder="0.00"
          className="px-2.5 py-1.5 rounded-md border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Max Amount</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.maxAmount}
          onChange={(e) => onChange("maxAmount", e.target.value)}
          placeholder="0.00"
          className="px-2.5 py-1.5 rounded-md border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Approver Role <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.approverRole}
          onChange={(e) => onChange("approverRole", e.target.value)}
          placeholder="e.g. finance_manager"
          className="px-2.5 py-1.5 rounded-md border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Approver User ID</label>
        <input
          type="text"
          value={form.approverUserId}
          onChange={(e) => onChange("approverUserId", e.target.value)}
          placeholder="uuid"
          className="px-2.5 py-1.5 rounded-md border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 font-mono"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Fallback Role</label>
        <input
          type="text"
          value={form.fallbackRole}
          onChange={(e) => onChange("fallbackRole", e.target.value)}
          placeholder="e.g. cfo"
          className="px-2.5 py-1.5 rounded-md border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Fallback User ID</label>
        <input
          type="text"
          value={form.fallbackUserId}
          onChange={(e) => onChange("fallbackUserId", e.target.value)}
          placeholder="uuid"
          className="px-2.5 py-1.5 rounded-md border bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 font-mono"
        />
      </div>
    </div>
  );
}

export function ApprovalRuleEditor({ policyId, rules }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<RuleFormState>(EMPTY_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RuleFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  function handleAddChange(field: keyof RuleFormState, value: string) {
    setAddForm((prev) => ({ ...prev, [field]: value }));
    setAddError(null);
  }

  function handleEditChange(field: keyof RuleFormState, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditError(null);
  }

  function handleAddSubmit() {
    const err = validateForm(addForm);
    if (err) { setAddError(err); return; }

    startTransition(async () => {
      const result = await addApprovalPolicyRule(policyId, formToInput(addForm));
      if (!result.success) { setAddError(result.error); return; }
      setShowAddForm(false);
      setAddForm(EMPTY_FORM);
      router.refresh();
    });
  }

  function handleEditStart(rule: ApprovalPolicyRule) {
    setEditingId(rule.id);
    setEditForm(ruleToForm(rule));
    setEditError(null);
  }

  function handleEditSubmit(ruleId: string) {
    const err = validateForm(editForm);
    if (err) { setEditError(err); return; }

    startTransition(async () => {
      const input = formToInput(editForm);
      const result = await updateApprovalPolicyRule(ruleId, {
        minAmount: input.minAmount ?? null,
        maxAmount: input.maxAmount ?? null,
        approverRole: input.approverRole ?? null,
        approverUserId: input.approverUserId ?? null,
        fallbackRole: input.fallbackRole ?? null,
        fallbackUserId: input.fallbackUserId ?? null,
      });
      if (!result.success) { setEditError(result.error); return; }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(ruleId: string) {
    startTransition(async () => {
      const result = await removeApprovalPolicyRule(ruleId);
      if (!result.success) return;
      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  function handleReorder(ruleId: string, direction: "up" | "down") {
    const ids = sortedRules.map((r) => r.id);
    const idx = ids.indexOf(ruleId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === ids.length - 1) return;

    const newIds = [...ids];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];

    startTransition(async () => {
      await reorderApprovalPolicyRules(policyId, newIds);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Policy Rules</p>
        {!showAddForm && (
          <button
            onClick={() => { setShowAddForm(true); setAddError(null); setAddForm(EMPTY_FORM); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        )}
      </div>

      {sortedRules.length === 0 && !showAddForm && (
        <div className="border border-dashed rounded-lg p-6 text-center text-sm text-[var(--muted-foreground)]">
          No rules configured. Add a rule to define who approves and under what conditions.
        </div>
      )}

      {sortedRules.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">#</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Min Amt</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Max Amt</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Approver Role</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Approver User</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Fallback Role</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Fallback User</th>
                <th className="px-3 py-2 font-medium text-[var(--muted-foreground)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRules.map((rule, idx) => (
                <>
                  <tr key={rule.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">{rule.sequence}</td>
                    <td className="px-3 py-2">{rule.minAmount != null ? `$${rule.minAmount}` : "—"}</td>
                    <td className="px-3 py-2">{rule.maxAmount != null ? `$${rule.maxAmount}` : "—"}</td>
                    <td className="px-3 py-2 font-mono">{rule.approverRole ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">
                      {rule.approverUserId ? rule.approverUserId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">{rule.fallbackRole ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">
                      {rule.fallbackUserId ? rule.fallbackUserId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleReorder(rule.id, "up")}
                          disabled={idx === 0 || isPending}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleReorder(rule.id, "down")}
                          disabled={idx === sortedRules.length - 1 || isPending}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEditStart(rule)}
                          disabled={isPending}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {confirmDeleteId === rule.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              disabled={isPending}
                              className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 transition-colors"
                              title="Confirm delete"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(rule.id)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === rule.id && (
                    <tr key={`edit-${rule.id}`} className="bg-blue-50 dark:bg-blue-900/10">
                      <td colSpan={8} className="px-3 py-4">
                        <div className="flex flex-col gap-3">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                            Editing Rule #{rule.sequence}
                          </p>
                          {editError && (
                            <p className="text-xs text-red-600 dark:text-red-400">{editError}</p>
                          )}
                          <RuleFormFields form={editForm} onChange={handleEditChange} />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSubmit(rule.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {isPending ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && (
        <div className="border rounded-xl p-4 bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-3">
          <p className="text-xs font-semibold">New Rule</p>
          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}
          <RuleFormFields form={addForm} onChange={handleAddChange} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSubmit}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Adding…" : "Add Rule"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddError(null); }}
              className="px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
