"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, CreditCard, Users } from "lucide-react";
import { sendBulkReminderForBucketAction } from "./actions";
import type { AgingReport, AtRiskCustomer, RecoveryMetrics, GatewayMetrics, AtRiskSignal } from "@/lib/pay/collections-intelligence";

interface Props {
  aging: AgingReport | null;
  atRisk: AtRiskCustomer[];
  recovery: RecoveryMetrics | null;
  gateway: GatewayMetrics | null;
}

const SIGNAL_LABELS: Record<AtRiskSignal, { label: string; color: string }> = {
  critical_overdue: { label: "Critical Overdue", color: "bg-red-100 text-red-700" },
  late_payer: { label: "Late Payer", color: "bg-amber-100 text-amber-700" },
  disputed: { label: "Disputed", color: "bg-orange-100 text-orange-700" },
  arrangement_defaulted: { label: "Arrangement Defaulted", color: "bg-red-100 text-red-800" },
};

const BUCKET_COLORS = [
  "bg-green-100 border-green-200",
  "bg-yellow-100 border-yellow-200",
  "bg-orange-100 border-orange-200",
  "bg-red-100 border-red-200",
  "bg-red-200 border-red-300",
];

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function CollectionsIntelligenceClient({ aging, atRisk, recovery, gateway }: Props) {
  const [sendingBucket, setSendingBucket] = useState<number | null>(null);
  const [sentBuckets, setSentBuckets] = useState<Set<number>>(new Set());

  async function handleSendReminders(bucketIndex: number, invoiceIds: string[]) {
    if (!invoiceIds.length) return;
    setSendingBucket(bucketIndex);
    try {
      await sendBulkReminderForBucketAction(invoiceIds);
      setSentBuckets((prev) => new Set([...prev, bucketIndex]));
    } finally {
      setSendingBucket(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Collections Intelligence</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aging analysis, at-risk customers, and payment recovery metrics.
        </p>
      </div>

      {/* ─── Aging Analysis ─── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Receivables Aging
          {aging && (
            <span className="ml-auto text-xs font-normal text-slate-400">
              As of {aging.asOf} · Total: {formatINR(aging.grandTotal)}
            </span>
          )}
        </h2>

        {!aging ? (
          <p className="text-sm text-slate-400">No aging data available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {aging.buckets.map((bucket, i) => (
              <div
                key={bucket.label}
                className={`rounded-xl border p-4 ${BUCKET_COLORS[i] ?? "bg-slate-50"}`}
              >
                <p className="text-xs font-medium text-slate-600">{bucket.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{bucket.count}</p>
                <p className="text-sm text-slate-600">{formatINR(bucket.totalAmount)}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {bucket.percentOfTotal.toFixed(1)}% of total
                </p>
                {bucket.invoiceIds.length > 0 && i > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full text-xs"
                    disabled={sendingBucket === i || sentBuckets.has(i)}
                    onClick={() => handleSendReminders(i, bucket.invoiceIds)}
                  >
                    {sendingBucket === i
                      ? "Queueing…"
                      : sentBuckets.has(i)
                      ? "Reminders Queued ✓"
                      : "Send Reminders"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── At-Risk Customers ─── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Users className="h-4 w-4 text-red-500" />
          At-Risk Customers
          <Badge variant="danger" className="ml-2">
            {atRisk.length}
          </Badge>
        </h2>

        {atRisk.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-slate-400">
              No at-risk customers detected.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {atRisk.map((customer) => (
              <Card key={customer.customerId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{customer.customerName}</p>
                    <p className="text-xs text-slate-500">
                      Outstanding: {formatINR(customer.totalOutstanding)} ·{" "}
                      {customer.oldestInvoiceDays}d oldest overdue
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.signals.map((sig) => (
                      <span
                        key={sig}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SIGNAL_LABELS[sig].color}`}
                      >
                        {SIGNAL_LABELS[sig].label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ─── Recovery Metrics ─── */}
      {recovery && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Payment Recovery (Last 6 Months)
          </h2>
          <Card>
            <CardContent className="overflow-x-auto py-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">Month</th>
                    <th className="px-3 py-2 text-right font-medium">Issued</th>
                    <th className="px-3 py-2 text-right font-medium">Paid ≤30d</th>
                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                    <th className="px-3 py-2 text-right font-medium">Avg Days</th>
                  </tr>
                </thead>
                <tbody>
                  {recovery.months.map((m) => (
                    <tr key={m.month} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-800">{m.month}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{m.issuedCount}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{m.paidWithin30}</td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={
                            m.paidWithin30Rate >= 0.8
                              ? "text-green-600"
                              : m.paidWithin30Rate >= 0.5
                              ? "text-amber-600"
                              : "text-red-600"
                          }
                        >
                          {(m.paidWithin30Rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {m.avgDaysToPayment !== null ? `${m.avgDaysToPayment.toFixed(1)}d` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ─── Gateway Performance ─── */}
      {gateway && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
            <CreditCard className="h-4 w-4 text-blue-500" />
            Gateway Performance (Last 30 Days)
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-1 pt-3">
                <p className="text-xs text-slate-500">Links Created</p>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-2xl font-bold text-slate-900">{gateway.linksCreated}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3">
                <p className="text-xs text-slate-500">Links Paid</p>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-2xl font-bold text-green-700">{gateway.linksPaid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3">
                <p className="text-xs text-slate-500">Success Rate</p>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-2xl font-bold text-slate-900">
                  {(gateway.paymentSuccessRate * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3">
                <p className="text-xs text-slate-500">Avg Time to Pay</p>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-2xl font-bold text-slate-900">
                  {gateway.avgMinutesToPayment !== null
                    ? `${Math.round(gateway.avgMinutesToPayment)}m`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {Object.keys(gateway.methodBreakdown).length > 0 && (
            <Card className="mt-3">
              <CardHeader>
                <p className="text-sm font-medium text-slate-700">Payment Method Breakdown</p>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-wrap gap-3">
                  {Object.entries(gateway.methodBreakdown).map(([method, count]) => (
                    <div
                      key={method}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-center"
                    >
                      <p className="text-lg font-bold text-slate-900">{count}</p>
                      <p className="text-xs capitalize text-slate-500">{method}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
