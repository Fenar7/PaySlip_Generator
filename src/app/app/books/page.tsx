import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, DashboardSection, ContentPanel, ActivityItem, ActivityList } from "@/components/dashboard";
import { getBooksOverview } from "./actions";
import { JournalRowActions } from "./components/journal-row-actions";
import { PeriodActionButtons } from "./components/period-action-buttons";
import { BookOpen, ArrowRight, FileSpreadsheet } from "lucide-react";

export const metadata = {
  title: "Books | Slipwise",
};

export default async function BooksOverviewPage() {
  const result = await getBooksOverview();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl bg-[var(--state-danger-soft)] px-4 py-3 text-sm text-[var(--state-danger)]">
          {result.error}
        </div>
      </div>
    );
  }

  const { metrics, setup, recentJournals, periods, trialBalance } = result.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Books</h1>
            <Badge variant={trialBalance.balanced ? "success" : "danger"}>
              {trialBalance.balanced ? "Balanced" : "Out of balance"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Accounting foundation, journals, fiscal periods, and core finance controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app/books/journals/new">
            <Button>Manual Journal</Button>
          </Link>
          <Link href="/app/books/trial-balance">
            <Button variant="secondary">Trial Balance</Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <DashboardSection>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Template"
            value={setup.templateKey.replaceAll("_", " ")}
          />
          <KpiCard
            label="Accounts"
            value={metrics.totalAccounts}
          />
          <KpiCard
            label="Posted journals"
            value={metrics.postedJournals}
          />
          <KpiCard
            label="Open periods"
            value={metrics.openPeriods}
          />
          <KpiCard
            label="Locked periods"
            value={metrics.lockedPeriods}
          />
        </div>
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Recent journals */}
        <ContentPanel padding="none">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent journals</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Latest journal activity across manual and operational postings.
              </p>
            </div>
            <Link
              href="/app/books/journals"
              className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
            >
              View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-5 py-3 font-medium">Entry</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {recentJournals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
                      No journals posted yet.
                    </td>
                  </tr>
                ) : (
                  recentJournals.map((journal) => (
                    <tr key={journal.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{journal.entryNumber}</div>
                        {journal.sourceRef && (
                          <div className="text-xs text-[var(--text-muted)]">{journal.sourceRef}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                        {new Date(journal.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                        {journal.source.replaceAll("_", " ")}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-[var(--text-primary)]">
                        {journal.totalDebit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            journal.status === "POSTED"
                              ? "success"
                              : journal.status === "REVERSED"
                                ? "warning"
                                : "default"
                          }
                        >
                          {journal.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <JournalRowActions journalEntryId={journal.id} status={journal.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ContentPanel>

        {/* Fiscal periods */}
        <ContentPanel padding="none">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Fiscal periods</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Lock and reopen periods with an explicit audit trail.
              </p>
            </div>
            <Badge variant="default">
              TB {trialBalance.debit.toFixed(2)} / {trialBalance.credit.toFixed(2)}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{period.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {new Date(period.startDate).toLocaleDateString()} —{" "}
                        {new Date(period.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          period.status === "OPEN"
                            ? "success"
                            : period.status === "LOCKED"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {period.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <PeriodActionButtons periodId={period.id} status={period.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentPanel>
      </div>
    </div>
  );
}
