"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

function formatCurrency(value: number): string {
  if (value >= 10_00_000) return `₹${(value / 10_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value}`;
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
      style={{
        background: "#fff",
        border: "1px solid #E0E0E0",
        borderRadius: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 600, color: "#1C1B1F", marginBottom: 4 }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontWeight: 500 }}>
          {entry.name}: ₹{entry.value.toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}

interface RevenueChartProps {
  data: RevenueTrendPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const hasData = data.some((d) => d.invoiced > 0 || d.paid > 0);

  return (
    <div
      className="flex h-full flex-col rounded-2xl border bg-white p-4"
      style={{ borderColor: "#E0E0E0", minHeight: 340 }}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "#1C1B1F" }}>
          Revenue Overview
        </h3>
        <p className="text-xs" style={{ color: "#79747E" }}>
          Invoiced vs Collected — Last 12 Months
        </p>
      </div>

      {hasData ? (
        <div className="flex-1" style={{ minHeight: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.35} />
                  <stop offset="40%" stopColor="#DC2626" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="40%" stopColor="#16A34A" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#F0F0F0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="invoiced"
                name="Invoiced"
                stroke="#DC2626"
                strokeWidth={2.5}
                fill="url(#gradInvoiced)"
                dot={false}
                activeDot={{ r: 5, stroke: "#DC2626", strokeWidth: 2, fill: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="paid"
                name="Collected"
                stroke="#16A34A"
                strokeWidth={2.5}
                fill="url(#gradPaid)"
                dot={false}
                activeDot={{ r: 5, stroke: "#16A34A", strokeWidth: 2, fill: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" style={{ minHeight: 260 }}>
          <p className="text-sm" style={{ color: "#79747E" }}>
            No revenue data yet. Create and issue your first invoice.
          </p>
        </div>
      )}
    </div>
  );
}
