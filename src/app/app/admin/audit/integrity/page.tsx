import { Suspense } from "react";
import { IntegrityDashboard } from "./integrity-dashboard";

export const metadata = { title: "Audit Chain Integrity — Slipwise One" };

export default function AuditIntegrityPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Chain Integrity</h1>
        <p className="text-muted-foreground mt-1">
          Forensic audit log verification and regulatory export
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Loading audit data…</div>}>
        <IntegrityDashboard />
      </Suspense>
    </div>
  );
}
