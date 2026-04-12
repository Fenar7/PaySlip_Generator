import { getChartOfAccounts } from "../../actions";
import { ManualJournalForm } from "../../components/manual-journal-form";

export const metadata = {
  title: "Manual Journal | Slipwise",
};

export default async function ManualJournalPage() {
  const accountsResult = await getChartOfAccounts();

  if (!accountsResult.success) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{accountsResult.error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Manual Journal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Post a balanced journal entry using manual-entry-enabled accounts only.
        </p>
      </div>

      <ManualJournalForm accounts={accountsResult.data} />
    </div>
  );
}
