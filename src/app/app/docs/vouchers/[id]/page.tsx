import { notFound } from "next/navigation";
import { getVoucher } from "../actions";
import { VoucherBrandingWrapper } from "../new/branding-wrapper";
import { listVendors } from "@/app/app/data/actions";
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
  const [voucher, vendorsResult, events] = await Promise.all([
    getVoucher(id),
    listVendors({ limit: 100 }).catch(() => ({ vendors: [] })),
    getDocumentTimelineForPage("voucher", id).catch(() => []),
  ]);

  if (!voucher) {
    notFound();
  }

  return (
    <div>
      <VoucherBrandingWrapper existingVoucher={voucher} vendors={vendorsResult.vendors} />
      {/* Phase 19.2: Voucher lifecycle timeline */}
      <div className="mx-auto max-w-4xl px-4 pb-8">
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <DocumentTimeline events={events} title="History" />
        </div>
      </div>
    </div>
  );
}
