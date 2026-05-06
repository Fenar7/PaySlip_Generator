"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartContainer, chartPalette } from "@/components/charts/chart-theme";

interface DocBreakdownProps {
  counts: {
    invoice: number;
    voucher: number;
    salarySlip: number;
  };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div
      style={{
        background: "var(--surface-panel)",
        border: "1px solid var(--border-soft)",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
        {p.name}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>{p.value} documents</p>
    </div>
  );
}

export function DocBreakdownChart({ counts }: DocBreakdownProps) {
  const data = [
    { name: "Invoices", value: counts.invoice, color: chartPalette[0] },
    { name: "Vouchers", value: counts.voucher, color: chartPalette[1] },
    { name: "Salary Slips", value: counts.salarySlip, color: chartPalette[3] },
  ].filter((d) => d.value > 0);

  const total = counts.invoice + counts.voucher + counts.salarySlip;
  const hasData = data.length > 0;

  return (
    <ChartContainer
      title="Document Breakdown"
      subtitle="Distribution by type"
      height={280}
      empty={!hasData}
      emptyMessage="No documents yet"
      className="relative"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold" style={{ color: "#1C1B1F" }}>{total}</p>
        <p className="text-xs" style={{ color: "#79747E" }}>Total</p>
      </div>
    </ChartContainer>
  );
}
