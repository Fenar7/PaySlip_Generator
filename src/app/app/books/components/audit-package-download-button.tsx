"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportBooksAuditPackageJson } from "../actions";

interface AuditPackageDownloadButtonProps {
  fiscalPeriodId: string;
}

export function AuditPackageDownloadButton({ fiscalPeriodId }: AuditPackageDownloadButtonProps) {
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await exportBooksAuditPackageJson(fiscalPeriodId);
      if (!result.success) {
        alert(result.error);
        return;
      }

      const blob = new Blob([result.data], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `books-audit-package-${fiscalPeriodId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={download} disabled={isPending}>
      {isPending ? "Preparing..." : "Download Audit Package"}
    </Button>
  );
}
