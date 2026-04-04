"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createVendor, updateVendor, type VendorInput } from "../actions";

interface VendorFormProps {
  vendor?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxId: string | null;
    gstin: string | null;
  };
}

export function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter();
  const isEdit = !!vendor;
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<VendorInput>({
    defaultValues: vendor ? {
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      taxId: vendor.taxId || "",
      gstin: vendor.gstin || "",
    } : undefined,
  });
  
  const onSubmit = async (data: VendorInput) => {
    const result = isEdit
      ? await updateVendor(vendor.id, data)
      : await createVendor(data);
    
    if (result.success) {
      router.push("/app/data/vendors");
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            {...register("phone")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
        <textarea
          {...register("address")}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tax ID</label>
          <input
            {...register("taxId")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">GSTIN</label>
          <input
            {...register("gstin")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Update Vendor" : "Create Vendor"}
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
