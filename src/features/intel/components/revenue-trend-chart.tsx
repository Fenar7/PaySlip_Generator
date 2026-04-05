"use client";

import {
  ResponsiveContainer,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  Legend,
} from "recharts";

interface RevenueTrendPoint {
  month: string;
  invoiced: number;
  paid: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
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
    <div className="rounded-lg border border-[var(--border-soft)] bg-white p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-[var(--foreground)]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: ₹{entry.value.toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const hasData = data.some((d) => d.invoiced > 0 || d.paid > 0);

  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white p-6 shadow-sm">
        <p className="text-sm text-[var(--muted-foreground)]">
          No revenue data yet. Create and issue your first invoice to see trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">
        Revenue Trend — Last 12 Months
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-soft)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={formatCurrency}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar
            dataKey="invoiced"
            name="Invoiced"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            barSize={24}
            opacity={0.85}
          />
          <Line
            dataKey="paid"
            name="Paid"
            type="monotone"
            stroke="var(--success)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--success)" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
