import type { Metadata } from "next";
import { VoucherBrandingWrapper } from "./branding-wrapper";
import { listVendors } from "@/app/app/data/actions";

export const metadata: Metadata = {
  title: "Voucher Studio",
  description: "Create and export payment and receipt vouchers.",
};

export default async function NewVoucherPage() {
  let vendors: Awaited<ReturnType<typeof listVendors>>["vendors"] = [];
  try {
    const result = await listVendors({ limit: 100 });
    vendors = result.vendors;
  } catch {
    // Not authenticated or no org — show empty picker
  }

  return <VoucherBrandingWrapper vendors={vendors} />;
}
