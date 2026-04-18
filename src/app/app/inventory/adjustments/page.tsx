import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TableEmpty } from "@/components/ui/table-empty";
import { listStockAdjustments, type StockAdjustmentFilters } from "./actions";
import type { StockAdjustmentStatus, StockAdjustmentReason } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Stock Adjustments — Slipwise One" };

const STATUS_BADGE: Record<
  StockAdjustmentStatus,
  { label: string; variant: "default" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  POSTED: { label: "Posted", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

const REASON_LABEL: Record<StockAdjustmentReason, string> = {
  PHYSICAL_COUNT: "Physical Count",
  DAMAGE: "Damage",
  THEFT: "Theft",
  EXPIRED: "Expired",
  FOUND: "Found",
  CORRECTION: "Correction",
  OTHER: "Other",
};

export default async function Page() {
  const { orgId } = await requireOrgContext();
  void orgId;

  const filters: StockAdjustmentFilters = {};
  const result = await listStockAdjustments(filters);

  if (!result.success) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const adjustments = result.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {adjustments.length} adjustment{adjustments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/inventory/adjustments/new">
          <Button variant="primary" size="md">+ New Adjustment</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-[var(--foreground)]">All Adjustments</span>
        </CardHeader>
        <CardContent className="p-0">
          {adjustments.length === 0 ? (
            <TableEmpty
              icon="⚖️"
              message="No stock adjustments yet"
              description="Create an adjustment to correct stock levels for damage, count discrepancies, or other reasons."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    {["Adjustment No", "Warehouse", "Reason", "Status", "Lines", "Date"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {adjustments.map((adj) => {
                    const badge = STATUS_BADGE[adj.status];
                    return (
                      <tr
                        key={adj.id}
                        className="transition-colors hover:bg-[var(--surface-soft)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--foreground)]">
                          {adj.adjustmentNumber}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)]">
                          {adj.warehouse.name}
                          <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                            ({adj.warehouse.code})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {REASON_LABEL[adj.reason]}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                          {adj.lines.length}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {adj.createdAt.toLocaleDateString("en-IN")}
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
