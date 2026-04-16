import { listUnmatchedPayments } from "./actions";
import { UnmatchedQueueClient } from "./unmatched-queue-client";

export default async function UnmatchedPaymentsPage() {
  const result = await listUnmatchedPayments();
  const payments = result.success ? result.data : [];

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Unmatched Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments received via virtual accounts that could not be automatically reconciled.
        </p>
      </div>
      <UnmatchedQueueClient initialPayments={payments} />
    </div>
  );
}
