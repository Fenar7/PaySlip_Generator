"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getBooksJournalAttachmentDownloadUrl } from "../actions";

interface JournalAttachmentDownloadButtonProps {
  attachmentId: string;
}

export function JournalAttachmentDownloadButton({
  attachmentId,
}: JournalAttachmentDownloadButtonProps) {
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await getBooksJournalAttachmentDownloadUrl(attachmentId);
      if (!result.success) {
        alert(result.error);
        return;
      }

      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={download}
      disabled={isPending}
    >
      {isPending ? "Opening..." : "Open"}
    </Button>
  );
}
