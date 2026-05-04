import { Suspense } from "react";
import { listVendors, deleteVendor } from "../actions";
import { DataTable } from "../components/data-table";
import { PageHeader } from "../components/page-header";

export const metadata = {
  title: "Vendors | Slipwise",
};

async function VendorsTable({ search, page }: { search?: string; page: number }) {
  const { vendors, total, totalPages } = await listVendors({ search, page, limit: 20 });

  return (
    <DataTable
      data={vendors}
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "gstin", label: "GSTIN" },
      ]}
      entityType="vendor"
      editPath="/app/data/vendors"
      deleteAction={deleteVendor}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  );
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Vendors"
        description="Manage your vendors for expenses"
        addLink="/app/data/vendors/new"
        addLabel="Add Vendor"
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--brand-primary)]" />
            Loading...
          </div>
        }
      >
        <VendorsTable search={params.search} page={page} />
      </Suspense>
    </div>
  );
}
