import type { Metadata } from "next";
import { listInvoicesForSelect } from "../actions";
import { RecurringRuleForm } from "./recurring-rule-form";

export const metadata: Metadata = { title: "Create Recurring Rule | Slipwise" };

export default async function NewRecurringRulePage() {
  const invoices = await listInvoicesForSelect();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
          SW&gt; Pay
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Create Recurring Rule
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Set up automatic invoice generation on a schedule.
        </p>
      </div>

      <RecurringRuleForm invoices={invoices} />
    </div>
  );
}
