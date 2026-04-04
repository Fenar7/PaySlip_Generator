"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import type { VoucherFormValues } from "../types";

const CATEGORIES = [
  "Meals", "Travel", "Accommodation", "Supplies", "Communication",
  "Entertainment", "Medical", "Repairs", "Utilities", "Miscellaneous",
];

export function MultiLineVoucherEditor() {
  const { control, register, watch } = useFormContext<VoucherFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const lineItems = watch("lineItems") ?? [];

  const categoryTotals = lineItems.reduce<Record<string, number>>((acc, item) => {
    if (item.category && item.amount) {
      acc[item.category] = (acc[item.category] ?? 0) + (parseFloat(String(item.amount)) || 0);
    }
    return acc;
  }, {});

  const grandTotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(String(item.amount)) || 0);
  }, 0);

  const addRow = () => {
    append({
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      amount: "",
      category: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-[var(--border-soft)]">
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-28">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-20">Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-32">Category</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 w-24">Amount</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((field, index) => (
              <tr key={field.id} className="hover:bg-slate-50/50">
                <td className="px-3 py-1.5">
                  <input
                    type="date"
                    {...register(`lineItems.${index}.date`)}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-[var(--accent)] focus:bg-white focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="time"
                    {...register(`lineItems.${index}.time`)}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-[var(--accent)] focus:bg-white focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    {...register(`lineItems.${index}.description`)}
                    placeholder="Description"
                    className="w-full rounded border border-transparent bg-transparent px-2 py-0.5 text-sm focus:border-[var(--accent)] focus:bg-white focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <select
                    {...register(`lineItems.${index}.category`)}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-[var(--accent)] focus:bg-white focus:outline-none"
                  >
                    <option value="">Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    {...register(`lineItems.${index}.amount`)}
                    type="number"
                    placeholder="0.00"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRow();
                      }
                    }}
                    className="w-full rounded border border-transparent bg-transparent px-2 py-0.5 text-right text-sm focus:border-[var(--accent)] focus:bg-white focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 text-sm text-[var(--accent)] hover:opacity-80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add row (or press Enter in last row)
          </button>
        </div>
      </div>

      {Object.keys(categoryTotals).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Category Totals</h4>
          <div className="space-y-1.5">
            {Object.entries(categoryTotals).map(([cat, total]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-slate-600">{cat}</span>
                <span className="font-medium text-slate-900">
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
              <span className="text-slate-900">Grand Total</span>
              <span className="text-slate-900">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
