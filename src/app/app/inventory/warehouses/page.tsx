import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TableEmpty } from "@/components/ui/table-empty";
import { listWarehouses } from "./actions";

export const metadata: Metadata = { title: "Warehouses — Slipwise One" };

export default async function Page() {
  const { orgId } = await requireOrgContext();
  void orgId;

  const result = await listWarehouses(true);

  if (!result.success) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const warehouses = result.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouses</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {warehouses.length} warehouse{warehouses.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Link href="/app/inventory/warehouses/new">
          <Button variant="primary" size="md">+ New Warehouse</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-[var(--foreground)]">All Warehouses</span>
        </CardHeader>
        <CardContent className="p-0">
          {warehouses.length === 0 ? (
            <TableEmpty
              icon="🏭"
              message="No warehouses yet"
              description="Add a warehouse to start managing stock locations."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    {[
                      "Name",
                      "Code",
                      "City",
                      "State",
                      "Default",
                      "Active",
                      "Stock Items",
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
                  {warehouses.map((w) => (
                    <tr
                      key={w.id}
                      className="transition-colors hover:bg-[var(--surface-soft)]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {w.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                        {w.code}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {w.city ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {w.state ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {w.isDefault ? (
                          <Badge variant="success">Default</Badge>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={w.isActive ? "success" : "danger"}>
                          {w.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                        {w.stockItemCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
