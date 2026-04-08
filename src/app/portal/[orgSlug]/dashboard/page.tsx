import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/portal-auth";
import { db } from "@/lib/db";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ISSUED: "bg-blue-100 text-blue-700",
  VIEWED: "bg-purple-100 text-purple-700",
  DUE: "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DISPUTED: "bg-pink-100 text-pink-700",
  CANCELLED: "bg-slate-200 text-slate-500",
  REISSUED: "bg-indigo-100 text-indigo-700",
  ARRANGEMENT_MADE: "bg-teal-100 text-teal-700",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await getPortalSession();
  if (!session) redirect(`/portal/${orgSlug}/auth/login`);

  const [customer, recentInvoices, outstandingAgg] = await Promise.all([
    db.customer.findUnique({
      where: { id: session.customerId },
      select: { name: true, email: true },
    }),
    db.invoice.findMany({
      where: {
        organizationId: session.orgId,
        customerId: session.customerId,
        status: { not: "DRAFT" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        totalAmount: true,
        remainingAmount: true,
        status: true,
      },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: session.orgId,
        customerId: session.customerId,
        status: { notIn: ["DRAFT", "PAID", "CANCELLED"] },
      },
      _sum: { remainingAmount: true },
    }),
  ]);

  const outstandingBalance = outstandingAgg._sum.remainingAmount ?? 0;

  // Log portal access
  await db.customerPortalAccessLog.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      path: `/portal/${orgSlug}/dashboard`,
    },
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {customer?.name || "Customer"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s an overview of your account
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Outstanding Balance */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Outstanding Balance
          </p>
          <p className={`mt-2 text-2xl font-bold ${outstandingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(outstandingBalance)}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
            Quick Actions
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/portal/${orgSlug}/invoices`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              View All Invoices
            </Link>
            <Link
              href={`/portal/${orgSlug}/statements`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              View Statement
            </Link>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
            Account
          </p>
          <p className="text-sm font-medium text-slate-900">{customer?.name}</p>
          {customer?.email && (
            <p className="text-sm text-slate-500">{customer.email}</p>
          )}
          <Link
            href={`/portal/${orgSlug}/profile`}
            className="mt-3 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Manage Profile →
          </Link>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Invoices
          </h2>
          <Link
            href={`/portal/${orgSlug}/invoices`}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            View All →
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0h3m-3 0h-3m-2.25 0H9.75m0 0H6.75m11.25-12H9.75M5.625 3.375h12.75c.621 0 1.125.504 1.125 1.125v15c0 .621-.504 1.125-1.125 1.125H5.625a1.125 1.125 0 01-1.125-1.125v-15c0-.621.504-1.125 1.125-1.125z" />
            </svg>
            <p className="text-sm text-slate-500">No invoices yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Recent invoices">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">Invoice #</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="group">
                    <td className="px-6 py-3">
                      <Link
                        href={`/portal/${orgSlug}/invoices/${inv.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        #{inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{inv.invoiceDate}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-700"}`}>
                        {inv.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
