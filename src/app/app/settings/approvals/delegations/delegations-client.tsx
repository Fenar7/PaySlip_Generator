"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createDelegation,
  revokeDelegation,
  listMyDelegations,
  type DelegationRow,
} from "./actions";

interface Colleague {
  id: string;
  name: string | null;
  email: string | null;
}

export function DelegationsClient({ colleagues }: { colleagues: Colleague[] }) {
  const [delegations, setDelegations] = useState<DelegationRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    toUserId: "",
    reason: "",
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  });

  useEffect(() => {
    startTransition(async () => {
      const result = await listMyDelegations();
      if (result.success) setDelegations(result.data);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createDelegation({
        toUserId: form.toUserId,
        reason: form.reason,
        validFrom: form.validFrom,
        validUntil: form.validUntil,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const refreshed = await listMyDelegations();
      if (refreshed.success) setDelegations(refreshed.data);
      setForm((f) => ({ ...f, toUserId: "", reason: "", validUntil: "" }));
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeDelegation(id);
      const refreshed = await listMyDelegations();
      if (refreshed.success) setDelegations(refreshed.data);
    });
  }

  const activeDelegations = delegations.filter((d) => d.isActive);
  const pastDelegations = delegations.filter((d) => !d.isActive);

  return (
    <div className="space-y-8">
      {/* Create form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border bg-card p-6 space-y-4 max-w-xl"
      >
        <h3 className="font-medium">Set Up Delegation</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Delegate approvals to</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.toUserId}
            onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))}
            required
          >
            <option value="">Select a colleague…</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email ?? c.id}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From date</label>
            <Input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Until date</label>
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reason (optional)</label>
          <Input
            placeholder="e.g. Annual leave"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending || !form.toUserId || !form.validUntil}>
          {isPending ? "Saving…" : "Save Delegation"}
        </Button>
      </form>

      {/* Active delegations */}
      {activeDelegations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Active Delegations</h3>
          {activeDelegations.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium flex items-center gap-2">
                  To: {d.toUserName ?? d.toUserId}{" "}
                  <Badge variant="success">Active</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.validFrom).toLocaleDateString()} –{" "}
                  {new Date(d.validUntil).toLocaleDateString()}
                  {d.reason ? ` · ${d.reason}` : ""}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => handleRevoke(d.id)}
                disabled={isPending}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Past delegations */}
      {pastDelegations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">Past Delegations</h3>
          {pastDelegations.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border p-4 opacity-60"
            >
              <div className="space-y-0.5">
                <p className="text-sm">To: {d.toUserName ?? d.toUserId}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.validFrom).toLocaleDateString()} –{" "}
                  {new Date(d.validUntil).toLocaleDateString()}
                  {d.reason ? ` · ${d.reason}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {delegations.length === 0 && !isPending && (
        <p className="text-sm text-muted-foreground">No delegations configured yet.</p>
      )}
    </div>
  );
}
