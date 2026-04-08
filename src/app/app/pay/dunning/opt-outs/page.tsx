import { Suspense } from "react";
import { getDunningOptOuts } from "../actions";

export const metadata = {
  title: "Dunning Opt-Outs | Slipwise",
};

async function OptOutsTable() {
  const result = await getDunningOptOuts();

  if (!result.success) {
    return <p className="py-8 text-center text-red-500">{result.error}</p>;
  }

  const optOuts = result.data;

  if (optOuts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">
            ✅
          </span>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No opt-outs</h3>
        <p className="mt-1 text-sm text-slate-500">
          No customers have opted out of dunning reminders yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Customer Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Opted Out Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {optOuts.map((optOut) => (
            <tr key={optOut.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                {optOut.customerName}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(optOut.optedOutAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DunningOptOutsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Dunning Opt-Outs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Customers who have opted out of receiving dunning reminders
        </p>
      </div>

      <Suspense
        fallback={
          <div className="py-8 text-center text-slate-500">
            Loading opt-outs…
          </div>
        }
      >
        <OptOutsTable />
      </Suspense>
    </div>
  );
}
