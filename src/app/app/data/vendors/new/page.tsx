import { VendorForm } from "../../components/vendor-form";

export const metadata = {
  title: "Add Vendor | Slipwise",
};

export default function NewVendorPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add Vendor</h1>
      <VendorForm />
    </div>
  );
}
