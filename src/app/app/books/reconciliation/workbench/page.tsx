import { getBooksReconciliationWorkspace } from "../../actions";
import { WorkbenchClient } from "./workbench-client";

export const metadata = {
  title: "Reconciliation Workbench | Slipwise Books",
};

export default async function ReconciliationWorkbenchPage() {
  const result = await getBooksReconciliationWorkspace({
    status: "UNMATCHED",
  });

  const suggestedResult = await getBooksReconciliationWorkspace({
    status: "SUGGESTED",
  });

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }
  if (!suggestedResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {suggestedResult.error}
        </div>
      </div>
    );
  }

  const unmatched = result.data.transactions;
  const suggested = suggestedResult.data.transactions;

  const allPending = [
    ...unmatched,
    ...suggested.filter((t) => !unmatched.some((u) => u.id === t.id)),
  ].sort((a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime());

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reconciliation Workbench</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review unmatched bank transactions and confirm or reject suggested matches.
        </p>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
          {unmatched.length} Unmatched
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
          {suggested.length} Suggested
        </span>
      </div>

      <WorkbenchClient transactions={allPending} />
    </div>
  );
}
