import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TableEmpty } from "@/components/ui/table-empty";
import { listStockTransfers, type StockTransferFilters } from "./actions";
import type { StockTransferStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Stock Transfers — Slipwise One" };

const STATUS_BADGE: Record<
  StockTransferStatus,
  { label: string; variant: "default" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  IN_TRANSIT: { label: "In Transit", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export default async function Page() {
  const { orgId } = await requireOrgContext();
  void orgId;

  const filters: StockTransferFilters = {};
  const result = await listStockTransfers(filters);

  if (!result.success) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const transfers = result.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Transfers</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {transfers.length} transfer{transfers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/inventory/transfers/new">
          <Button variant="primary" size="md">+ New Transfer</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-[var(--foreground)]">All Transfers</span>
        </CardHeader>
        <CardContent className="p-0">
          {transfers.length === 0 ? (
            <TableEmpty
              icon="🚚"
              message="No stock transfers yet"
              description="Create a transfer to move stock between warehouses."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    {["Transfer No", "Route", "Status", "Lines", "Date"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {transfers.map((t) => {
                    const badge = STATUS_BADGE[t.status];
                    return (
                      <tr
                        key={t.id}
                        className="transition-colors hover:bg-[var(--surface-soft)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--foreground)]">
                          {t.transferNumber}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)]">
                          <span className="flex items-center gap-1.5">
                            <span>{t.fromWarehouse.name}</span>
                            <span className="text-[var(--muted-foreground)]">→</span>
                            <span>{t.toWarehouse.name}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                          {t.lines.length}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {t.createdAt.toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
