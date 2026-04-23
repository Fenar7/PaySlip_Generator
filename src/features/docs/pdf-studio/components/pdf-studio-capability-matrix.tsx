"use client";

import { getPdfStudioCapabilityMatrix } from "@/features/docs/pdf-studio/lib/plan-gates";

export function PdfStudioCapabilityMatrix() {
  const rows = getPdfStudioCapabilityMatrix();

  return (
    <section className="rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="max-w-3xl">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Free, workspace, and Pro boundaries
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Public tools stay useful without an account, workspace adds signed-in history and document context, and Pro unlocks the heavy conversion lane.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-[var(--border-strong)] px-3 py-3 font-medium text-[var(--muted-foreground)]">
                Capability
              </th>
              <th className="border-b border-[var(--border-strong)] px-3 py-3 font-medium text-[var(--muted-foreground)]">
                Free
              </th>
              <th className="border-b border-[var(--border-strong)] px-3 py-3 font-medium text-[var(--muted-foreground)]">
                Workspace
              </th>
              <th className="border-b border-[var(--border-strong)] px-3 py-3 font-medium text-[var(--muted-foreground)]">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="border-b border-[var(--border-soft)] px-3 py-3 align-top font-medium text-[var(--foreground)]">
                  {row.label}
                </th>
                <td className="border-b border-[var(--border-soft)] px-3 py-3 align-top text-[var(--foreground-soft)]">
                  {row.free}
                </td>
                <td className="border-b border-[var(--border-soft)] px-3 py-3 align-top text-[var(--foreground-soft)]">
                  {row.workspace}
                </td>
                <td className="border-b border-[var(--border-soft)] px-3 py-3 align-top text-[var(--foreground-soft)]">
                  {row.pro}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
