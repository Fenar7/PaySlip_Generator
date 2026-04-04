import { notFound } from "next/navigation";
import { getVoucher } from "../actions";
import { VoucherBrandingWrapper } from "../new/branding-wrapper";
import { listVendors } from "@/app/app/data/actions";

export const metadata = {
  title: "Edit Voucher | Slipwise",
};

export default async function EditVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [voucher, vendorsResult] = await Promise.all([
    getVoucher(id),
    listVendors({ limit: 100 }).catch(() => ({ vendors: [] })),
  ]);

  if (!voucher) {
    notFound();
  }

  return <VoucherBrandingWrapper existingVoucher={voucher} vendors={vendorsResult.vendors} />;
}
