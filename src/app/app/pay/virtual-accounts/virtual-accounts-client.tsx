"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createCustomerVirtualAccount, closeCustomerVirtualAccount } from "./actions";
import type { VirtualAccountWithCustomer } from "./actions";

interface Props {
  initialAccounts: VirtualAccountWithCustomer[];
}

export function VirtualAccountsClient({ initialAccounts }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!customerId.trim()) {
      setError("Please enter a Customer ID.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCustomerVirtualAccount(customerId.trim());
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAccounts((prev) => {
        const exists = prev.some((a) => a.id === result.data.id);
        return exists ? prev : [result.data, ...prev];
      });
      setCustomerId("");
    });
  }

  function handleClose(vaId: string) {
    startTransition(async () => {
      const result = await closeCustomerVirtualAccount(vaId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === vaId ? { ...a, isActive: false, closedAt: new Date() } : a
        )
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Create Virtual Account</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={isPending}
          />
          <Button variant="primary" onClick={handleCreate} disabled={isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No virtual accounts yet.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((va) => (
            <div key={va.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{va.customer.name}</p>
                  {va.customer.email && (
                    <p className="text-xs text-muted-foreground">{va.customer.email}</p>
                  )}
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Account:</span>{" "}
                      <span className="font-mono">{va.accountNumber}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">IFSC:</span>{" "}
                      <span className="font-mono">{va.ifsc}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={va.isActive ? "success" : "default"}>
                    {va.isActive ? "Active" : "Closed"}
                  </Badge>
                  {va.isActive && (
                    <Button
                      variant="danger"
                      onClick={() => handleClose(va.id)}
                      disabled={isPending}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
