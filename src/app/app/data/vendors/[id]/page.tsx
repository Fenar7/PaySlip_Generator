import { notFound } from "next/navigation";
import { getVendor } from "../../actions";
import { VendorForm } from "../../components/vendor-form";

export const metadata = {
  title: "Edit Vendor | Slipwise",
};

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await getVendor(id);
  
  if (!vendor) {
    notFound();
  }
  
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit Vendor</h1>
      <VendorForm vendor={vendor} />
    </div>
  );
}
