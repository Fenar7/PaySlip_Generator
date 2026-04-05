import Link from "next/link";
import { Suspense } from "react";
import { listSalaryPresets, deleteSalaryPreset } from "../salary-preset-actions";

export const metadata = {
  title: "Salary Presets | Slipwise",
};

const LIMIT = 20;

async function PresetsList({ page }: { page: number }) {
  const offset = (page - 1) * LIMIT;
  const { presets, total } = await listSalaryPresets({ limit: LIMIT, offset });
  const totalPages = Math.ceil(total / LIMIT);

  if (presets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No presets yet</h3>
        <p className="mt-1 text-sm text-slate-500">
          Create reusable salary component packages.
        </p>
        <Link
          href="/app/data/salary-presets/new"
          className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Create Preset
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {presets.map((preset) => {
          const earnings = preset.components.filter((c) => c.type === "earning");
          const deductions = preset.components.filter((c) => c.type === "deduction");
          const totalEarnings = earnings.reduce((s, c) => s + c.amount, 0);
          const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);

          return (
            <div key={preset.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{preset.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="text-green-700">
                      Earnings: {earnings.length} items · ₹
                      {totalEarnings.toLocaleString("en-IN")}
                    </span>
                    <span className="text-red-600">
                      Deductions: {deductions.length} items · ₹
                      {totalDeductions.toLocaleString("en-IN")}
                    </span>
                    <span className="font-medium text-slate-700">
                      Net: ₹{(totalEarnings - totalDeductions).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {preset.components.slice(0, 6).map((c, i) => (
                      <span
                        key={i}
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          c.type === "earning"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {c.label}
                      </span>
                    ))}
                    {preset.components.length > 6 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        +{preset.components.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <Link
                    href={`/app/data/salary-presets/${preset.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await deleteSalaryPreset(preset.id);
                    }}
                  >
                    <button type="submit" className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default async function SalaryPresetsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Salary Presets</h1>
            <p className="mt-1 text-sm text-slate-500">
              Reusable salary component packages for quick slip generation
            </p>
          </div>
          <Link
            href="/app/data/salary-presets/new"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Create Preset
          </Link>
        </div>
        <Suspense
          fallback={<div className="py-8 text-center text-slate-500">Loading...</div>}
        >
          <PresetsList page={page} />
        </Suspense>
      </div>
    </div>
  );
}
