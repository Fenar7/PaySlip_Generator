import { notFound } from "next/navigation";
import { getVoucher } from "../actions";
import { VoucherBrandingWrapper } from "../new/branding-wrapper";
import { listVendors } from "@/app/app/data/actions";
import { DocumentAttachments } from "@/components/docs/document-attachments";
import { getDocAttachments } from "@/app/app/docs/attachment-actions";

export const metadata = {
  title: "Edit Voucher | Slipwise",
};

export default async function EditVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [voucher, vendorsResult, attachments] = await Promise.all([
    getVoucher(id),
    listVendors({ limit: 100 }).catch(() => ({ vendors: [] })),
    getDocAttachments(id, "voucher"),
  ]);

  if (!voucher) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <VoucherBrandingWrapper existingVoucher={voucher} vendors={vendorsResult.vendors} />
      </div>
      <aside className="w-full shrink-0 lg:w-80">
        <DocumentAttachments docId={voucher.id} docType="voucher" attachments={attachments} />
      </aside>
    </div>
  );
}
