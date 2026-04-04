import { CustomerForm } from "../../components/customer-form";

export const metadata = {
  title: "Add Customer | Slipwise",
};

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add Customer</h1>
      <CustomerForm />
    </div>
  );
}
