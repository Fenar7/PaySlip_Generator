import { Suspense } from "react";
import { CancelBillingPageClient } from "./page-client";

export default function CancelBillingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-6" />}>
      <CancelBillingPageClient />
    </Suspense>
  );
}
