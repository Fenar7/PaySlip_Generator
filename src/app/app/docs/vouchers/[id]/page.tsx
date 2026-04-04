import { notFound } from "next/navigation";
import { getVoucher } from "../actions";
import { VoucherBrandingWrapper } from "../new/branding-wrapper";

export const metadata = {
  title: "Edit Voucher | Slipwise",
};

export default async function EditVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const voucher = await getVoucher(id);

  if (!voucher) {
    notFound();
  }

  return <VoucherBrandingWrapper existingVoucher={voucher} />;
}
