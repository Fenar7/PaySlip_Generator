import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TableEmpty } from "@/components/ui/table-empty";
import { listPurchaseOrders, type PurchaseOrderFilters } from "./actions";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Purchase Orders — Slipwise One" };

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

const STATUS_BADGE: Record<
  PurchaseOrderStatus,
  { label: string; variant: "default" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  PARTIALLY_RECEIVED: { label: "Partially Received", variant: "warning" },
  FULLY_RECEIVED: { label: "Fully Received", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export default async function Page() {
  const { orgId } = await requireOrgContext();
  void orgId;

  const filters: PurchaseOrderFilters = {};
  const result = await listPurchaseOrders(filters);

  if (!result.success) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const orders = result.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {orders.length} purchase order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/procurement/po/new">
          <Button variant="primary" size="md">+ New Purchase Order</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-[var(--foreground)]">All Purchase Orders</span>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <TableEmpty
              icon="📋"
              message="No purchase orders yet"
              description="Raise a purchase order to track procurement from your vendors."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    {["PO Number", "Vendor", "Date", "Status", "Total Amount", "Items"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] [&:nth-child(5)]:text-right"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {orders.map((po) => {
                    const badge = STATUS_BADGE[po.status];
                    return (
                      <tr
                        key={po.id}
                        className="transition-colors hover:bg-[var(--surface-soft)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--foreground)]">
                          {po.poNumber}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)]">
                          {po.vendor.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {po.poDate}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {fmt.format(Number(po.totalAmount))}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                          {po._count.lines}
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
