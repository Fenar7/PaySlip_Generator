import { notFound } from "next/navigation";
import { getCustomer } from "../../actions";
import { CustomerForm } from "../../components/customer-form";
import { DetailLayout, DetailRailCard, MetadataField } from "@/components/layout/detail-layout";

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
    <DetailLayout
      rail={
        <DetailRailCard title="Customer Info">
          <dl className="space-y-3">
            <MetadataField label="Name" value={customer.name} />
            {customer.email && <MetadataField label="Email" value={customer.email} />}
            {customer.phone && <MetadataField label="Phone" value={customer.phone} />}
            {customer.gstin && <MetadataField label="GSTIN" value={customer.gstin} />}
            {customer.taxId && <MetadataField label="Tax ID" value={customer.taxId} />}
            {customer.address && (
              <MetadataField label="Address" value={<span className="whitespace-pre-line">{customer.address}</span>} />
            )}
          </dl>
        </DetailRailCard>
      }
    >
      <h1 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">Edit Customer</h1>
      <CustomerForm customer={customer} />
    </DetailLayout>
  );
}
