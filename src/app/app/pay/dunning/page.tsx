import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DunningStats } from "./components/dunning-stats";
import { listDunningSequences } from "./actions";

export const metadata = {
  title: "Dunning & Reminders | Slipwise",
};

async function SequencesList() {
  const result = await listDunningSequences();

  if (!result.success) {
    return <p className="py-8 text-center text-red-500">{result.error}</p>;
  }

  const sequences = result.data;

  if (sequences.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">
            🔔
          </span>
        </div>
        <h3 className="text-lg font-medium text-slate-900">
          No dunning sequences yet
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Create your first sequence to automate payment reminders.
        </p>
        <div className="mt-4">
          <Link href="/app/pay/dunning/sequences/new">
            <Button size="sm">Create Sequence</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Steps
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Default
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sequences.map((seq) => (
            <tr key={seq.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/app/pay/dunning/sequences/${seq.id}`}
                  className="font-medium text-blue-600 hover:underline text-sm"
                >
                  {seq.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {seq.stepsCount} step{seq.stepsCount !== 1 ? "s" : ""}
              </td>
              <td className="px-4 py-3">
                <Badge variant={seq.isActive ? "success" : "default"}>
                  {seq.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {seq.isDefault && <Badge variant="warning">Default</Badge>}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(seq.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DunningPage() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Dunning & Reminders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automate payment reminders with multi-step dunning sequences
          </p>
        </div>
        <Link href="/app/pay/dunning/sequences/new">
          <Button>New Sequence</Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <DunningStats />
      </Suspense>

      {/* Sequences Table */}
      <Suspense
        fallback={
          <div className="py-8 text-center text-slate-500">
            Loading sequences…
          </div>
        }
      >
        <SequencesList />
      </Suspense>
    </div>
  );
}
