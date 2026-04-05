"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  getSalaryReport,
  exportSalaryReportCSV,
  type SalaryReportRow,
} from "./actions";
import {
  ReportFilterBar,
  type FilterField,
  type FilterValues,
} from "@/features/intel/components/report-filter-bar";
import {
  ReportDataTable,
  StatusBadge,
  formatCurrency,
  type Column,
} from "@/features/intel/components/report-data-table";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_OPTIONS = MONTH_NAMES.slice(1).map((m, i) => ({
  value: String(i + 1),
  label: m,
}));

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "released", label: "Released" },
  { value: "approved", label: "Approved" },
];

const FILTER_FIELDS: FilterField[] = [
  {
    key: "employeeId",
    label: "Employee ID",
    type: "text",
    placeholder: "Employee ID",
  },
  { key: "month", label: "Month", type: "select", options: MONTH_OPTIONS },
  { key: "year", label: "Year", type: "select", options: YEAR_OPTIONS },
  { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
  {
    key: "department",
    label: "Department",
    type: "text",
    placeholder: "Department",
  },
];

const COLUMNS: Column<SalaryReportRow>[] = [
  { key: "employeeName", label: "Employee Name" },
  { key: "employeeCode", label: "Employee ID" },
  { key: "department", label: "Department" },
  {
    key: "period",
    label: "Period",
    sortable: true,
    render: (row) => `${MONTH_NAMES[row.month]} ${row.year}`,
  },
  {
    key: "grossPay",
    label: "Gross Salary",
    sortable: true,
    render: (row) => formatCurrency(row.grossPay),
  },
  {
    key: "totalDeductions",
    label: "Total Deductions",
    render: (row) => formatCurrency(row.totalDeductions),
  },
  {
    key: "netPay",
    label: "Net Pay",
    sortable: true,
    render: (row) => (
      <span className="font-medium">{formatCurrency(row.netPay)}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
];

export default function SalaryReportPage() {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<SalaryReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<FilterValues>({});
  const [loaded, setLoaded] = useState(false);
  const [summary, setSummary] = useState({
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    headcount: 0,
  });

  const fetchData = useCallback(
    (f: FilterValues, p: number, sk?: string, sd?: "asc" | "desc") => {
      startTransition(async () => {
        const result = await getSalaryReport({
          employeeId: f.employeeId as string | undefined,
          month: f.month ? Number(f.month) : undefined,
          year: f.year ? Number(f.year) : undefined,
          status: f.status as string | undefined,
          department: f.department as string | undefined,
          page: p,
          sortKey: sk,
          sortDir: sd,
        });
        setRows(result.rows);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
        setSummary({
          totalGross: result.totalGross,
          totalDeductions: result.totalDeductions,
          totalNet: result.totalNet,
          headcount: result.headcount,
        });
        setLoaded(true);
      });
    },
    []
  );

  const handleApply = (v: FilterValues) => {
    setFilters(v);
    fetchData(v, 1, sortKey, sortDir);
  };

  const handleClear = () => {
    const cleared: FilterValues = {};
    setFilters(cleared);
    fetchData(cleared, 1, undefined, "asc");
    setSortKey(undefined);
  };

  const handlePageChange = (p: number) => fetchData(filters, p, sortKey, sortDir);

  const handleSort = (key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    fetchData(filters, 1, key, dir);
  };

  const handleExport = () => {
    startTransition(async () => {
      const csv = await exportSalaryReportCSV({
        employeeId: filters.employeeId as string | undefined,
        month: filters.month ? Number(filters.month) : undefined,
        year: filters.year ? Number(filters.year) : undefined,
        status: filters.status as string | undefined,
        department: filters.department as string | undefined,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!loaded && !isPending) {
    fetchData(filters, 1);
  }

  return (
    <div className="min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/app/intel/reports"
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← Back to Reports
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Salary Report
          </h1>
        </div>
        <button
          onClick={handleExport}
          disabled={isPending || rows.length === 0}
          className="h-9 rounded-lg border border-[var(--border-soft)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-40 transition-colors"
        >
          Export CSV
        </button>
      </header>

      {/* Summary strip */}
      {loaded && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Total Gross
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
              {formatCurrency(summary.totalGross)}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-red-600">
              Total Deductions
            </p>
            <p className="mt-1 text-xl font-bold text-red-700">
              {formatCurrency(summary.totalDeductions)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
              Total Net Pay
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {formatCurrency(summary.totalNet)}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
              Headcount
            </p>
            <p className="mt-1 text-xl font-bold text-blue-700">
              {summary.headcount}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <ReportFilterBar
          fields={FILTER_FIELDS}
          values={filters}
          onApply={handleApply}
          onClear={handleClear}
        />
      </div>

      {isPending && !loaded ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
          Loading…
        </div>
      ) : (
        <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
          <ReportDataTable
            columns={COLUMNS}
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortKey={sortKey}
            sortDir={sortDir}
          />
        </div>
      )}
    </div>
  );
}
