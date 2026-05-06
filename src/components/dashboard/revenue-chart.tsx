"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface RevenueTrendPoint {
  month: string;
  invoiced: number;
  paid: number;
}

function formatCurrency(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-4 py-3 text-xs"
      style={{
        background: "rgba(255,255,255,0.96)",
        borderColor: "#E0E0E0",
        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
      }}
    >
      <p className="mb-2 text-[11px] font-semibold" style={{ color: "#1C1B1F" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span style={{ color: "#79747E" }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: "#1C1B1F" }}>
            ₹{entry.value.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

interface RevenueChartProps {
  data: RevenueTrendPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const hasData = data.some((d) => d.invoiced > 0 || d.paid > 0);
  const latest = data[data.length - 1];

  return (
    <div
      className="flex h-full flex-col rounded-2xl border bg-white p-5"
      style={{ borderColor: "#E0E0E0", minHeight: 280 }}
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#1C1B1F" }}>
            Revenue Overview
          </h3>
          <p className="text-[11px]" style={{ color: "#79747E" }}>
            Invoiced vs Collected — Last 12 Months
          </p>
        </div>
        {latest && (
          <div className="text-right">
            <p className="text-[11px]" style={{ color: "#79747E" }}>
              {latest.month}
            </p>
            <p className="text-sm font-bold" style={{ color: "#DC2626" }}>
              {formatCurrency(latest.invoiced)}
            </p>
          </div>
        )}
      </div>

      {hasData ? (
        <div className="flex-1" style={{ minHeight: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
              barGap={4}
            >
              <defs>
                <linearGradient id="barInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
                <linearGradient id="barPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#16A34A" />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="#F0F0F0"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={50}
                dx={-4}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }}
              />

              <Bar
                dataKey="invoiced"
                name="Invoiced"
                fill="url(#barInvoiced)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="paid"
                name="Collected"
                fill="url(#barPaid)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" style={{ minHeight: 180 }}>
          <p className="text-sm" style={{ color: "#79747E" }}>
            No revenue data yet. Create and issue your first invoice.
          </p>
        </div>
      )}
    </div>
  );
}
