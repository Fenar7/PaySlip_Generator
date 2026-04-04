"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createEmployee, updateEmployee, type EmployeeInput } from "../actions";

interface EmployeeFormProps {
  employee?: {
    id: string;
    name: string;
    email: string | null;
    employeeId: string | null;
    designation: string | null;
    department: string | null;
    bankName: string | null;
    bankAccount: string | null;
    bankIFSC: string | null;
    panNumber: string | null;
  };
}

export function EmployeeForm({ employee }: EmployeeFormProps) {
  const router = useRouter();
  const isEdit = !!employee;
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmployeeInput>({
    defaultValues: employee ? {
      name: employee.name,
      email: employee.email || "",
      employeeId: employee.employeeId || "",
      designation: employee.designation || "",
      department: employee.department || "",
      bankName: employee.bankName || "",
      bankAccount: employee.bankAccount || "",
      bankIFSC: employee.bankIFSC || "",
      panNumber: employee.panNumber || "",
    } : undefined,
  });
  
  const onSubmit = async (data: EmployeeInput) => {
    const result = isEdit
      ? await updateEmployee(employee.id, data)
      : await createEmployee(data);
    
    if (result.success) {
      router.push("/app/data/employees");
    } else {
      alert(result.error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Name *
        </label>
        <input
          {...register("name", { required: "Name is required" })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Employee ID</label>
          <input
            {...register("employeeId")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Designation</label>
          <input
            {...register("designation")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
          <input
            {...register("department")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      
      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-medium text-slate-900">Bank Details</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bank Name</label>
            <input
              {...register("bankName")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Account Number</label>
              <input
                {...register("bankAccount")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">IFSC Code</label>
              <input
                {...register("bankIFSC")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">PAN Number</label>
        <input
          {...register("panNumber")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Update Employee" : "Create Employee"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
