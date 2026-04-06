import { Suspense } from "react";
import { UpgradePageClient } from "./page-client";

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl p-6" />}>
      <UpgradePageClient />
    </Suspense>
  );
}
