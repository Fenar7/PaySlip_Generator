import { getCashPositionAction } from "../../actions";
import { CashPositionClient } from "./cash-position-client";

export const metadata = {
  title: "Cash Position | Slipwise Books",
};

export default async function CashPositionPage() {
  const result = await getCashPositionAction();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cash Position</h1>
        <p className="mt-1 text-sm text-slate-500">
          Actual bank balance, this month's cash flow, and upcoming receivables.
        </p>
      </div>
      <CashPositionClient data={result.data} />
    </div>
  );
}
