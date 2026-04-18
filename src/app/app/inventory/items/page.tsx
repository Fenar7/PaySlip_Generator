import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TableEmpty } from "@/components/ui/table-empty";
import { listInventoryItems } from "./actions";

export const metadata: Metadata = { title: "Inventory Items — Slipwise One" };

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function Page() {
  const { orgId } = await requireOrgContext();
  // orgId is consumed by requireOrgContext; listInventoryItems resolves it internally
  void orgId;

  const result = await listInventoryItems({ pageSize: 100 });

  if (!result.success) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { items, total } = result.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Items</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {total} item{total !== 1 ? "s" : ""} in your catalogue
          </p>
        </div>
        <Link href="/app/inventory/items/new">
          <Button variant="primary" size="md">+ New Item</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-[var(--foreground)]">All Items</span>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <TableEmpty
              icon="📦"
              message="No inventory items yet"
              description="Add your first item to start tracking stock levels and valuations."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    {["SKU", "Name", "Category", "Unit", "Cost Price", "Selling Price", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] last:text-left [&:nth-child(5)]:text-right [&:nth-child(6)]:text-right"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {items.map((item) => {
                    const isLowStock =
                      item.trackInventory && item.totalAvailable <= item.reorderLevel;
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-[var(--surface-soft)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          <span className="flex items-center gap-2">
                            {item.name}
                            {isLowStock && (
                              <Badge variant="warning">Low Stock</Badge>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {item.category ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {fmt.format(Number(item.costPrice))}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {fmt.format(Number(item.sellingPrice))}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.isActive ? "success" : "danger"}>
                            {item.isActive ? "Active" : "Archived"}
                          </Badge>
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
