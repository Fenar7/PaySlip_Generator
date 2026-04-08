"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  updateDunningSequence,
  deleteDunningSequence,
} from "../../actions";

interface SequenceActionsProps {
  sequenceId: string;
  isActive: boolean;
  isDefault: boolean;
}

export function SequenceActions({
  sequenceId,
  isActive,
  isDefault,
}: SequenceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggleActive() {
    setLoading("active");
    try {
      await updateDunningSequence(sequenceId, { isActive: !isActive });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleToggleDefault() {
    setLoading("default");
    try {
      await updateDunningSequence(sequenceId, { isDefault: !isDefault });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this sequence and all its steps?")) return;
    setLoading("delete");
    try {
      const result = await deleteDunningSequence(sequenceId);
      if (result.success) {
        router.push("/app/pay/dunning");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleToggleActive}
        disabled={loading !== null}
      >
        {loading === "active"
          ? "…"
          : isActive
            ? "Deactivate"
            : "Activate"}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleToggleDefault}
        disabled={loading !== null}
      >
        {loading === "default"
          ? "…"
          : isDefault
            ? "Unset Default"
            : "Set Default"}
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={handleDelete}
        disabled={loading !== null}
      >
        {loading === "delete" ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
