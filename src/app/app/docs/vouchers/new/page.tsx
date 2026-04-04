import type { Metadata } from "next";
import { VoucherWorkspace } from "@/features/docs/voucher/components/voucher-workspace";

export const metadata: Metadata = {
  title: "Voucher Studio",
  description: "Create and export payment and receipt vouchers.",
};

export default function NewVoucherPage() {
  return <VoucherWorkspace />;
}
