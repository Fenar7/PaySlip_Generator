import { notFound } from "next/navigation";
import { getEmployee } from "../../actions";
import { EmployeeForm } from "../../components/employee-form";

export const metadata = {
  title: "Edit Employee | Slipwise",
};

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  
  if (!employee) {
    notFound();
  }
  
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit Employee</h1>
      <EmployeeForm employee={employee} />
    </div>
  );
}
