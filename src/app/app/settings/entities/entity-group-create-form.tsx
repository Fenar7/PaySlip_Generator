"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEntityGroup } from "./actions";
import { useRouter } from "next/navigation";

export function EntityGroupCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createEntityGroup({ name, description, currency });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="eg-name">Group Name</Label>
        <Input
          id="eg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Group"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="eg-desc">Description (optional)</Label>
        <Input
          id="eg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Holding structure for Acme entities"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="eg-currency">Consolidation Currency</Label>
        <Input
          id="eg-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="INR"
          className="mt-1 w-32"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? "Creating…" : "Create Entity Group"}
      </Button>
    </form>
  );
}
