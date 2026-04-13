import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SlaPolicyForm } from "@/components/flow/sla-policy-form";

export const metadata: Metadata = { title: "Create SLA Policy — Flow" };

export default function NewSlaPolicyPage() {
  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/flow/sla"
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          SLA Policies
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create SLA Policy</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Configure response and resolution targets for ticket handling.
        </p>
      </div>

      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-950 shadow-sm">
        <SlaPolicyForm mode="create" />
      </div>
    </div>
  );
}
