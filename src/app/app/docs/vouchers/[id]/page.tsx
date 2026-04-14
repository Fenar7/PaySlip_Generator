import { notFound } from "next/navigation";
import { getVoucher } from "../actions";
import { VoucherBrandingWrapper } from "../new/branding-wrapper";
import { listVendors } from "@/app/app/data/actions";
import { DocumentAttachments } from "@/components/docs/document-attachments";
import { getDocAttachments } from "@/app/app/docs/attachment-actions";
import { getDocumentTimelineForPage } from "@/lib/document-events";
import { DocumentTimeline } from "@/components/docs/document-timeline";

export const metadata = {
  title: "Edit Voucher | Slipwise",
};

export default async function EditVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [voucher, vendorsResult, attachments, events] = await Promise.all([
    getVoucher(id),
    listVendors({ limit: 100 }).catch(() => ({ vendors: [] })),
    getDocAttachments(id, "voucher"),
    getDocumentTimelineForPage("voucher", id).catch(() => []),
  ]);

  if (!voucher) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <VoucherBrandingWrapper existingVoucher={voucher} vendors={vendorsResult.vendors} />
        </div>
        <aside className="w-full shrink-0 lg:w-80">
          <DocumentAttachments docId={voucher.id} docType="voucher" attachments={attachments} />
        </aside>
      </div>

      {/* Phase 19.2: Voucher lifecycle timeline */}
      <div className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <DocumentTimeline events={events} title="History" />
        </div>
      </div>
    </div>
  );
}
