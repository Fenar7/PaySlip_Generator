"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInterCompanyTransfer } from "./actions";
import { useRouter } from "next/navigation";

export function InterCompanyTransferForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entityGroupId, setEntityGroupId] = useState("");
  const [destinationOrgId, setDestinationOrgId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!entityGroupId || !destinationOrgId || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please fill in all required fields with valid values.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createInterCompanyTransfer({
      entityGroupId,
      destinationOrgId,
      amount: parsedAmount,
      description,
      transferDate,
      referenceNumber: referenceNumber || undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setOpen(false);
      setEntityGroupId("");
      setDestinationOrgId("");
      setAmount("");
      setDescription("");
      setReferenceNumber("");
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        + New Transfer
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">New Inter-Company Transfer</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="ict-group">Entity Group ID</Label>
            <Input
              id="ict-group"
              value={entityGroupId}
              onChange={(e) => setEntityGroupId(e.target.value)}
              placeholder="Group cuid"
              required
              className="mt-1"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="ict-dest">Destination Org ID</Label>
            <Input
              id="ict-dest"
              value={destinationOrgId}
              onChange={(e) => setDestinationOrgId(e.target.value)}
              placeholder="Destination org cuid"
              required
              className="mt-1"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="ict-amount">Amount</Label>
            <Input
              id="ict-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="mt-1"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="ict-date">Transfer Date</Label>
            <Input
              id="ict-date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="ict-desc">Description</Label>
            <Input
              id="ict-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for transfer"
              required
              className="mt-1"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="ict-ref">Reference Number (optional)</Label>
            <Input
              id="ict-ref"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="ICT-001"
              className="mt-1"
            />
          </div>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <div className="col-span-2 flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Transfer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
