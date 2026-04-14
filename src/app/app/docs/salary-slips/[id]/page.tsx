import { notFound } from "next/navigation";
import Link from "next/link";
import { getSalarySlip, releaseSalarySlip, archiveSalarySlip } from "../actions";
import { DocumentAttachments } from "@/components/docs/document-attachments";
import { getDocAttachments } from "@/app/app/docs/attachment-actions";
import { getDocumentTimelineForPage } from "@/lib/document-events";
import { DocumentTimeline } from "@/components/docs/document-timeline";

export const metadata = {
  title: "Salary Slip Details | Slipwise",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function SalarySlipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [slip, attachments, events] = await Promise.all([
    getSalarySlip(id),
    getDocAttachments(id, "salary_slip"),
    getDocumentTimelineForPage("salary_slip", id).catch(() => []),
  ]);

  if (!slip) {
    notFound();
  }

  const earnings = slip.components.filter((c) => c.type === "earning");
  const deductions = slip.components.filter((c) => c.type === "deduction");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/app/docs/salary-slips" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Vault
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          {/* Slip Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{slip.slipNumber}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {MONTHS[slip.month - 1]} {slip.year}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${
              slip.status === "released" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
            }`}>
              {slip.status}
            </span>
          </div>

          {/* Employee Info */}
          {slip.employee && (
            <div className="mb-6 rounded-lg bg-slate-50 p-4">
              <h2 className="text-sm font-medium text-slate-500">Employee</h2>
              <p className="mt-1 text-lg font-medium text-slate-900">{slip.employee.name}</p>
              {slip.employee.email && (
                <p className="text-sm text-slate-500">{slip.employee.email}</p>
              )}
            </div>
          )}

          {/* Compensation Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Earnings */}
            <div>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">Earnings</h3>
              <div className="space-y-2">
                {earnings.map((comp) => (
                  <div key={comp.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{comp.label}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(comp.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">Deductions</h3>
              <div className="space-y-2">
                {deductions.length > 0 ? (
                  deductions.map((comp) => (
                    <div key={comp.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">{comp.label}</span>
                      <span className="font-medium text-red-600">-{formatCurrency(comp.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No deductions</p>
                )}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Gross Pay</span>
              <span className="font-medium text-slate-900">{formatCurrency(slip.grossPay)}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-lg font-medium text-slate-900">Net Pay</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(slip.netPay)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/app/docs/salary-slips/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create New
            </Link>
            
            {slip.status === "draft" && (
              <>
                <form action={async () => {
                  "use server";
                  await releaseSalarySlip(id);
                }}>
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Release
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  await archiveSalarySlip(id);
                }}>
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Archive
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="mt-8">
          <DocumentAttachments docId={slip.id} docType="salary_slip" attachments={attachments} />
        </div>

        {/* Timeline */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <DocumentTimeline events={events} title="History" />
        </div>
        </div>
      </div>
  );
}
