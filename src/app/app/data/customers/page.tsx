import { Suspense } from "react";
import { listCustomers, deleteCustomer } from "../actions";
import { DataTable } from "../components/data-table";
import { PageHeader } from "../components/page-header";

export const metadata = {
  title: "Customers | Slipwise",
};

async function CustomersTable({ search, page }: { search?: string; page: number }) {
  const { customers, total, totalPages } = await listCustomers({ search, page, limit: 20 });

  return (
    <DataTable
      data={customers}
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "gstin", label: "GSTIN" },
      ]}
      entityType="customer"
      editPath="/app/data/customers"
      deleteAction={deleteCustomer}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Customers"
        description="Manage your customers for invoices"
        addLink="/app/data/customers/new"
        addLabel="Add Customer"
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--brand-primary)]" />
            Loading...
          </div>
        }
      >
        <CustomersTable search={params.search} page={page} />
      </Suspense>
    </div>
  );
}
