import { Suspense } from "react";
import { listEmployees, deleteEmployee } from "../actions";
import { DataTable } from "../components/data-table";
import { PageHeader } from "../components/page-header";

export const metadata = {
  title: "Employees | Slipwise",
};

async function EmployeesTable({ search, page }: { search?: string; page: number }) {
  const { employees, total, totalPages } = await listEmployees({ search, page, limit: 20 });

  return (
    <DataTable
      data={employees}
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "employeeId", label: "Employee ID" },
        { key: "designation", label: "Designation" },
      ]}
      entityType="employee"
      editPath="/app/data/employees"
      deleteAction={deleteEmployee}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  );
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Employees"
        description="Manage your employees for payslips"
        addLink="/app/data/employees/new"
        addLabel="Add Employee"
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--brand-primary)]" />
            Loading...
          </div>
        }
      >
        <EmployeesTable search={params.search} page={page} />
      </Suspense>
    </div>
  );
}
