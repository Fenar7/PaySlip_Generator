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
import {
  ChartContainer,
  axisProps,
  yAxisProps,
  gridProps,
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
} from "@/components/charts/chart-theme";

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
    <div style={tooltipStyle}>
      <p style={tooltipLabelStyle}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ ...tooltipItemStyle, color: entry.color }}>
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
    <ChartContainer
      title="Revenue Overview"
      subtitle="Invoiced vs Collected — Last 12 Months"
      height={340}
      className="min-h-[360px]"
      empty={!hasData}
      emptyMessage="No revenue data yet. Create and issue your first invoice to see trends."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis tickFormatter={formatCurrency} {...yAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="invoiced"
            name="Invoiced"
            stroke="#DC2626"
            strokeWidth={2}
            fill="url(#colorInvoiced)"
            dot={{ r: 3, fill: "#DC2626", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "#DC2626", strokeWidth: 2, fill: "#fff" }}
          />
          <Area
            type="monotone"
            dataKey="paid"
            name="Collected"
            stroke="#16A34A"
            strokeWidth={2}
            fill="url(#colorPaid)"
            dot={{ r: 3, fill: "#16A34A", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "#16A34A", strokeWidth: 2, fill: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
