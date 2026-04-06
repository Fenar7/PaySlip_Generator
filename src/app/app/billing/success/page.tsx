import { Suspense } from "react";
import { BillingSuccessPageClient } from "./page-client";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center p-6" />}>
      <BillingSuccessPageClient />
    </Suspense>
  );
}
