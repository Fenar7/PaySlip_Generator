"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addEntityToGroup } from "./actions";
import { useRouter } from "next/navigation";

const ENTITY_TYPES = [
  { value: "SUBSIDIARY", label: "Subsidiary" },
  { value: "BRANCH", label: "Branch" },
] as const;

interface AddEntityFormProps {
  entityGroupId: string;
}

export function AddEntityForm({ entityGroupId }: AddEntityFormProps) {
  const router = useRouter();
  const [targetOrgId, setTargetOrgId] = useState("");
  const [entityType, setEntityType] = useState<"SUBSIDIARY" | "BRANCH">("SUBSIDIARY");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetOrgId.trim()) return;
    setSaving(true);
    setError(null);
    const result = await addEntityToGroup({ entityGroupId, targetOrgId, entityType });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setTargetOrgId("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="target-org-id" className="text-xs">
          Organisation ID
        </Label>
        <Input
          id="target-org-id"
          value={targetOrgId}
          onChange={(e) => setTargetOrgId(e.target.value)}
          placeholder="cuid…"
          required
          className="mt-1 w-56 text-xs"
        />
      </div>
      <div>
        <Label htmlFor="entity-type" className="text-xs">
          Entity Type
        </Label>
        <select
          id="entity-type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as "SUBSIDIARY" | "BRANCH")}
          className="mt-1 block h-9 rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={saving || !targetOrgId.trim()} size="sm">
        {saving ? "Adding…" : "Add Entity"}
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
