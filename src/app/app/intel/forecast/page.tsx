import { Suspense } from "react";
import { getForecastData } from "./actions";
import { ForecastWorkbench } from "./forecast-workbench";

export const metadata = {
  title: "AI Forecast | Slipwise Intel Pro",
};

async function ForecastLoader() {
  const result = await getForecastData();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  return <ForecastWorkbench initialData={result.data} />;
}

export default function ForecastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Cash Flow Forecast</h1>
        <p className="text-muted-foreground text-sm">
          Predictive P&L projections powered by EMA + Linear Regression ensemble.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        }
      >
        <ForecastLoader />
      </Suspense>
    </div>
  );
}
