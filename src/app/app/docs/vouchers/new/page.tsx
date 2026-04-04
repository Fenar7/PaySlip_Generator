import type { Metadata } from "next";
import { VoucherBrandingWrapper } from "./branding-wrapper";

export const metadata: Metadata = {
  title: "Voucher Studio",
  description: "Create and export payment and receipt vouchers.",
};

export default function NewVoucherPage() {
  return <VoucherBrandingWrapper />;
}
