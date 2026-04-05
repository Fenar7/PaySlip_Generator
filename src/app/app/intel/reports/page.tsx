import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reports | Slipwise" };

const REPORTS = [
  {
    title: "Invoice Report",
    description: "All invoices with status, amounts, dates and payment tracking.",
    href: "/app/intel/reports/invoices",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Receivables Report",
    description: "Aging analysis of unpaid invoices by 30/60/90+ day buckets.",
    href: "/app/intel/reports/receivables",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: "Voucher Report",
    description: "Spend analysis by type, category, and period.",
    href: "/app/intel/reports/vouchers",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    title: "Salary Report",
    description: "Payroll summary by employee, department, and month.",
    href: "/app/intel/reports/salary",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
] as const;

export default function ReportsHubPage() {
  return (
    <div className="min-h-screen">
      <header className="mb-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
          SW&gt; Intel
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Generate and export detailed business reports.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="group rounded-xl border border-[var(--border-soft)] bg-white p-6 shadow-sm hover:shadow-md hover:border-[var(--accent)] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[var(--surface-soft)] p-2.5 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                {report.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  {report.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {report.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                  Open Report
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
