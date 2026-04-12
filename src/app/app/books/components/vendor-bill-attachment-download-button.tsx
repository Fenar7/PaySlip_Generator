"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getBooksVendorBillAttachmentDownloadUrl } from "../actions";

interface VendorBillAttachmentDownloadButtonProps {
  attachmentId: string;
}

export function VendorBillAttachmentDownloadButton({
  attachmentId,
}: VendorBillAttachmentDownloadButtonProps) {
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await getBooksVendorBillAttachmentDownloadUrl(attachmentId);
      if (!result.success) {
        alert(result.error);
        return;
      }

      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={download} disabled={isPending}>
      {isPending ? "Opening..." : "Open"}
    </Button>
  );
}
