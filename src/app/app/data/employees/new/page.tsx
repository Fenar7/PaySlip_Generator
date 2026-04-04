import { EmployeeForm } from "../../components/employee-form";

export const metadata = {
  title: "Add Employee | Slipwise",
};

export default function NewEmployeePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add Employee</h1>
      <EmployeeForm />
    </div>
  );
}
