import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth/require-org";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getPendingMatchResults } from "./actions";

export const metadata: Metadata = { title: "Procurement Bills — Slipwise One" };

const MATCH_STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "warning" | "success" | "danger" }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  MATCHED: { label: "Matched", variant: "success" },
  PARTIAL_MATCH: { label: "Partial Match", variant: "warning" },
  MISMATCH: { label: "Mismatch", variant: "danger" },
  RESOLVED: { label: "Resolved", variant: "success" },
  WAIVED: { label: "Waived", variant: "default" },
};

export default async function Page() {
  const { orgId } = await requireOrgContext();
  void orgId;

  const matchResult = await getPendingMatchResults();
  const pendingMatches = matchResult.success ? matchResult.data : [];

  const fmt = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Procurement Bills</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Vendor bill management and 3-way match review
        </p>
      </div>

      {/* Redirect notice */}
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-4xl">🧾</div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                View and manage vendor bills in the Bills &amp; Payments section
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                All AP bills, payment runs, and vendor ledger are managed there.
              </p>
            </div>
            <Link
              href="/app/pay/vendor-bills"
              className="inline-flex h-10 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white shadow-[0_1px_3px_rgba(220,38,38,0.3)] transition-colors hover:bg-[var(--accent-strong)]"
            >
              Go to Bills &amp; Payments →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 3-Way Match Summary */}
      <div>
        <h2 className="mb-3 text-base font-semibold tracking-tight">
          Pending 3-Way Match Results
        </h2>
        {pendingMatches.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                {matchResult.success
                  ? "No discrepancies to review. All bills are matched."
                  : matchResult.error}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                {pendingMatches.length} match result
                {pendingMatches.length !== 1 ? "s" : ""} require attention
                <Badge variant="warning">{pendingMatches.length}</Badge>
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                      {["PO Number", "Vendor Bill", "Status", "Match Score"].map((h) => (
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
                    {pendingMatches.map((m) => {
                      const badge =
                        MATCH_STATUS_BADGE[m.matchStatus] ?? MATCH_STATUS_BADGE.MISMATCH;
                      return (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-[var(--surface-soft)]"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--foreground)]">
                            {m.purchaseOrder.poNumber}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                            {m.vendorBill.billNumber}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                            {fmt.format(m.overallScore * 100)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
