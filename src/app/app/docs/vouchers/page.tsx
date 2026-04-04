import { Suspense } from "react";
import Link from "next/link";
import { listVouchers, archiveVoucher, duplicateVoucher } from "./actions";

export const metadata = {
  title: "Voucher Vault | Slipwise",
};

const TYPE_COLORS: Record<string, string> = {
  payment: "bg-red-100 text-red-700",
  receipt: "bg-green-100 text-green-700",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_COLORS[type] || "bg-slate-100 text-slate-700"}`}
    >
      {type}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

async function VoucherTable({
  type,
  search,
  page,
}: {
  type?: "payment" | "receipt";
  search?: string;
  page: number;
}) {
  const { vouchers, total, totalPages } = await listVouchers({
    type,
    search,
    page,
    limit: 20,
  });

  if (vouchers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No vouchers yet</h3>
        <p className="mt-1 text-sm text-slate-500">
          Create your first voucher to get started.
        </p>
        <Link
          href="/app/docs/vouchers/new"
          className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Create Voucher
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Voucher #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Payee/Payer
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {vouchers.map((voucher) => (
            <tr key={voucher.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/app/docs/vouchers/${voucher.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {voucher.voucherNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                <TypeBadge type={voucher.type} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {voucher.voucherDate}
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {voucher.vendor?.name || "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                {formatCurrency(voucher.totalAmount)}
              </td>
              <td className="px-4 py-3 text-right">
                <VoucherActions voucherId={voucher.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VoucherActions({ voucherId }: { voucherId: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/app/docs/vouchers/${voucherId}`}
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        Open
      </Link>
      <form
        action={async () => {
          "use server";
          await duplicateVoucher(voucherId);
        }}
      >
        <button
          type="submit"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Duplicate
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await archiveVoucher(voucherId);
        }}
      >
        <button type="submit" className="text-sm text-red-600 hover:text-red-800">
          Archive
        </button>
      </form>
    </div>
  );
}

function TypeFilterChips({ currentType }: { currentType?: string }) {
  const types = [
    { value: "", label: "All" },
    { value: "payment", label: "Payments" },
    { value: "receipt", label: "Receipts" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <Link
          key={t.value}
          href={t.value ? `?type=${t.value}` : "?"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            currentType === t.value || (!currentType && !t.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const type = params.type as "payment" | "receipt" | undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Voucher Vault
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage payment and receipt vouchers
            </p>
          </div>
          <Link
            href="/app/docs/vouchers/new"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Create Voucher
          </Link>
        </div>

        <div className="mb-4">
          <TypeFilterChips currentType={type} />
        </div>

        <Suspense
          fallback={
            <div className="py-8 text-center text-slate-500">
              Loading vouchers...
            </div>
          }
        >
          <VoucherTable type={type} search={params.search} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
