import type { Metadata } from "next";

export const metadata: Metadata = { title: "Coming Soon" };

export default function FlowPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
        Coming Soon
      </p>
      <h1 className="text-3xl font-bold tracking-tight">SW&gt; Flow</h1>
      <p className="text-[var(--muted-foreground)] max-w-sm text-center">
        Workflow automation and approval chains. Launching in Phase 5.
      </p>
    </div>
  );
}
