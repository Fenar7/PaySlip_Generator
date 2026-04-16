import { listVirtualAccounts } from "./actions";
import { VirtualAccountsClient } from "./virtual-accounts-client";

export default async function VirtualAccountsPage() {
  const result = await listVirtualAccounts();
  const accounts = result.success ? result.data : [];

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Virtual Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign dedicated bank account numbers to customers for automatic payment reconciliation.
        </p>
      </div>
      <VirtualAccountsClient initialAccounts={accounts} />
    </div>
  );
}
