import { Suspense } from "react";
import { getTaxDashboardData } from "./actions";
import { TaxDashboard } from "./tax-dashboard";

export const metadata = {
  title: "Global Tax Compliance | Slipwise Intel Pro",
};

async function TaxLoader() {
  const result = await getTaxDashboardData();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  return <TaxDashboard data={result.data} />;
}

export default function GlobalTaxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Global Tax Compliance</h1>
        <p className="text-muted-foreground text-sm">
          Multi-region tax engine: IN-GST, UK-VAT, EU-VAT, US Sales Tax, AU/NZ/SG GST.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        }
      >
        <TaxLoader />
      </Suspense>
    </div>
  );
}
