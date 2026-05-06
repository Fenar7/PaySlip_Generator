"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DocBreakdownProps {
  counts: {
    invoice: number;
    voucher: number;
    salarySlip: number;
  };
}

const COLORS = ["#DC2626", "#2563EB", "#16A34A"];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
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
      <p style={{ fontWeight: 600, color: "#1C1B1F" }}>{p.name}</p>
      <p style={{ color: "#79747E" }}>{p.value} documents</p>
    </div>
  );
}

export function DocBreakdownChart({ counts }: DocBreakdownProps) {
  const data = [
    { name: "Invoices", value: counts.invoice },
    { name: "Vouchers", value: counts.voucher },
    { name: "Salary Slips", value: counts.salarySlip },
  ].filter((d) => d.value > 0);

  const total = counts.invoice + counts.voucher + counts.salarySlip;

  return (
    <div
      className="relative flex flex-col rounded-2xl border bg-white p-4"
      style={{ borderColor: "#E0E0E0", minHeight: 240 }}
    >
      <div className="mb-2">
        <h3 className="text-sm font-semibold" style={{ color: "#1C1B1F" }}>
          Document Breakdown
        </h3>
      </div>

      {data.length > 0 ? (
        <div className="flex-1" style={{ minHeight: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6">
            <p className="text-2xl font-bold" style={{ color: "#1C1B1F" }}>
              {total}
            </p>
            <p className="text-xs" style={{ color: "#79747E" }}>
              Total
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" style={{ minHeight: 180 }}>
          <p className="text-sm" style={{ color: "#79747E" }}>
            No documents yet
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex justify-center gap-4">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs" style={{ color: "#79747E" }}>
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
