import { notFound } from "next/navigation";
import { getCustomer } from "../../actions";
import { CustomerForm } from "../../components/customer-form";

export const metadata = {
  title: "Edit Customer | Slipwise",
};

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  
  if (!customer) {
    notFound();
  }
  
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit Customer</h1>
      <CustomerForm customer={customer} />
    </div>
  );
}
