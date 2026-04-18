import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TableEmpty } from "@/components/ui/table-empty";
import { listGoodsReceipts, type GoodsReceiptFilters } from "./actions";
import type { GrnStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Goods Receipts — Slipwise One" };

const STATUS_BADGE: Record<
  GrnStatus,
  { label: string; variant: "default" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export default async function Page() {
  const { orgId } = await requireOrgContext();
  void orgId;

  const filters: GoodsReceiptFilters = {};
  const result = await listGoodsReceipts(filters);

  if (!result.success) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const receipts = result.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goods Receipts</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/procurement/grn/new">
          <Button variant="primary" size="md">+ Record Receipt</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-[var(--foreground)]">
            All Goods Receipt Notes
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {receipts.length === 0 ? (
            <TableEmpty
              icon="📥"
              message="No goods receipts yet"
              description="Record a GRN when goods arrive against a purchase order."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    {[
                      "GRN Number",
                      "PO Number",
                      "Warehouse",
                      "Receipt Date",
                      "Status",
                      "Items Received",
                    ].map((h) => (
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
                  {receipts.map((grn) => {
                    const badge = STATUS_BADGE[grn.status];
                    return (
                      <tr
                        key={grn.id}
                        className="transition-colors hover:bg-[var(--surface-soft)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--foreground)]">
                          {grn.grnNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                          {grn.purchaseOrder.poNumber}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)]">
                          {grn.warehouse.name}
                          <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                            ({grn.warehouse.code})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {grn.receiptDate}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                          {grn._count.lines}
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
