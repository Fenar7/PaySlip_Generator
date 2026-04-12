import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksVendorBillFormOptions } from "../../actions";
import { VendorBillForm } from "../../components/vendor-bill-form";

export const metadata = {
  title: "New Vendor Bill | Slipwise",
};

export default async function NewVendorBillPage() {
  const result = await getBooksVendorBillFormOptions();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link href="/app/books/vendor-bills" className="text-sm font-medium text-blue-600 hover:underline">
          ← Back to Vendor Bills
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create Vendor Bill</h1>
        <p className="mt-1 text-sm text-slate-500">
          Capture a payable with structured line items, tax, due date, and future approval routing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Bill details</h2>
          <p className="mt-1 text-sm text-slate-500">
            Draft bills stay editable until submitted into approval and posting workflows.
          </p>
        </CardHeader>
        <CardContent>
          <VendorBillForm
            vendors={result.data.vendors}
            expenseAccounts={result.data.expenseAccounts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
