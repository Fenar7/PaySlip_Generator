"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { archiveBooksVendorBill, requestBooksVendorBillApproval } from "../actions";

interface VendorBillDetailActionsProps {
  vendorBillId: string;
  status: string;
  accountingStatus: string;
}

export function VendorBillDetailActions({
  vendorBillId,
  status,
  accountingStatus,
}: VendorBillDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRequestApproval() {
    startTransition(async () => {
      const result = await requestBooksVendorBillApproval(vendorBillId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleArchive() {
    if (!confirm("Archive this vendor bill? This will remove it from active AP workflows.")) {
      return;
    }

    startTransition(async () => {
      const result = await archiveBooksVendorBill(vendorBillId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/app/books/vendor-bills");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "DRAFT" && (
        <Button type="button" variant="secondary" onClick={handleRequestApproval} disabled={isPending}>
          {isPending ? "Submitting..." : "Request Approval"}
        </Button>
      )}
      {accountingStatus !== "POSTED" && (
        <Button type="button" variant="danger" onClick={handleArchive} disabled={isPending}>
          {isPending ? "Archiving..." : "Archive Bill"}
        </Button>
      )}
    </div>
  );
}
