import { requireEmployeeSession } from "@/lib/employee-portal-auth";
import { db } from "@/lib/db";
import { getMyPayslips, logoutEmployee } from "./actions";
import Link from "next/link";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export default async function EmployeePayslipsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await requireEmployeeSession(orgSlug);

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      name: true,
      employeeId: true,
      designation: true,
      department: true,
    },
  });

  const result = await getMyPayslips(orgSlug, session.employeeId);
  const slips = result.success ? result.data : [];

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">{org?.name}</div>
            <h1 className="font-semibold text-slate-900">Employee Pay Portal</h1>
          </div>
          <form
            action={async () => {
              "use server";
              await logoutEmployee(orgSlug);
            }}
          >
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Employee card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {employee?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{employee?.name}</div>
              <div className="text-sm text-slate-500">
                {employee?.designation}
                {employee?.department && ` · ${employee.department}`}
                {employee?.employeeId && ` · ${employee.employeeId}`}
              </div>
            </div>
          </div>
        </div>

        {/* Salary slips */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Salary Slips
          </h2>

          {slips.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              No salary slips available yet
            </div>
          ) : (
            <div className="space-y-2">
              {slips.map((slip) => (
                <div
                  key={slip.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {MONTHS[slip.month]} {slip.year}
                    </div>
                    <div className="text-sm text-slate-500">
                      Slip #{slip.slipNumber} · Gross {fmt(slip.grossPay)} · Net{" "}
                      <span className="font-semibold text-slate-800">
                        {fmt(slip.netPay)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/app/docs/salary-slips/${slip.id}/pdf`}
                    target="_blank"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Download PDF
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
