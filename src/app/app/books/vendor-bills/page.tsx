import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksVendorBillFormOptions, getBooksVendorBills } from "../actions";
import { booksStatusBadgeVariant, formatBooksDate, formatBooksMoney } from "../view-helpers";

export const metadata = {
  title: "Vendor Bills | Slipwise",
};

interface VendorBillsPageProps {
  searchParams: Promise<{
    status?: string;
    vendorId?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function VendorBillsPage({ searchParams }: VendorBillsPageProps) {
  const params = await searchParams;
  const [billsResult, optionsResult] = await Promise.all([
    getBooksVendorBills({
      status: params.status as never,
      vendorId: params.vendorId,
      search: params.search,
      page: params.page ? Number.parseInt(params.page, 10) : undefined,
    }),
    getBooksVendorBillFormOptions(),
  ]);

  if (!billsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{billsResult.error}</div>
      </div>
    );
  }

  if (!optionsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{optionsResult.error}</div>
      </div>
    );
  }

  const { bills, total, page, totalPages } = billsResult.data;
  const { vendors } = optionsResult.data;
  const overdueCount = bills.filter((bill) => bill.status === "OVERDUE").length;
  const pendingApprovalCount = bills.filter((bill) => bill.status === "PENDING_APPROVAL").length;
  const unpaidAmount = bills.reduce((sum, bill) => sum + bill.remainingAmount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Bills</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage structured payables, due dates, approvals, attachments, and AP aging.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app/books/payment-runs">
            <Button variant="secondary">Payment Runs</Button>
          </Link>
          <Link href="/app/books/vendor-bills/new">
            <Button>New Vendor Bill</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Bills in View", value: String(bills.length) },
          { label: "Pending Approval", value: String(pendingApprovalCount) },
          { label: "Overdue", value: String(overdueCount) },
          { label: "Outstanding", value: formatBooksMoney(unpaidAmount) },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-slate-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <p className="mt-1 text-sm text-slate-500">
            Narrow the AP queue by lifecycle state, vendor, or bill reference.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {[
                  "DRAFT",
                  "PENDING_APPROVAL",
                  "APPROVED",
                  "PARTIALLY_PAID",
                  "PAID",
                  "OVERDUE",
                  "CANCELLED",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Vendor</span>
              <select
                name="vendorId"
                defaultValue={params.vendorId ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Search</span>
              <input
                name="search"
                defaultValue={params.search ?? ""}
                placeholder="Bill number, vendor, or note"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
              <Button type="submit" variant="secondary">
                Apply Filters
              </Button>
              <Link href="/app/books/vendor-bills" className="text-sm font-medium text-slate-600 hover:underline">
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AP queue</h2>
            <p className="mt-1 text-sm text-slate-500">
              {total} vendor bill{total === 1 ? "" : "s"} across {totalPages} page{totalPages === 1 ? "" : "s"}.
            </p>
          </div>
          <Badge variant="default">Page {page}</Badge>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Bill</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Amounts</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                      No vendor bills match the current filters.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{bill.billNumber}</div>
                        <div className="text-xs text-slate-500">
                          {bill.currency} • {bill.approvalRequests.length} pending approval request
                          {bill.approvalRequests.length === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{bill.vendor?.name ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div>Bill {formatBooksDate(bill.billDate)}</div>
                        <div className="text-xs text-slate-500">Due {formatBooksDate(bill.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div>Total {formatBooksMoney(bill.totalAmount)}</div>
                        <div className="text-xs text-slate-500">
                          Remaining {formatBooksMoney(bill.remainingAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={booksStatusBadgeVariant(bill.status)}>{bill.status.replaceAll("_", " ")}</Badge>
                          <Badge variant={booksStatusBadgeVariant(bill.accountingStatus)}>
                            {bill.accountingStatus}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/app/books/vendor-bills/${bill.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-4 text-sm">
          {page > 1 && (
            <Link
              href={`/app/books/vendor-bills?${new URLSearchParams({
                ...(params.status ? { status: params.status } : {}),
                ...(params.vendorId ? { vendorId: params.vendorId } : {}),
                ...(params.search ? { search: params.search } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="font-medium text-blue-600 hover:underline"
            >
              ← Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/app/books/vendor-bills?${new URLSearchParams({
                ...(params.status ? { status: params.status } : {}),
                ...(params.vendorId ? { vendorId: params.vendorId } : {}),
                ...(params.search ? { search: params.search } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="font-medium text-blue-600 hover:underline"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
