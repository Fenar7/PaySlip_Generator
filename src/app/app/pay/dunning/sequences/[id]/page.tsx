import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { DunningStepForm } from "../../components/dunning-step-form";
import { SequenceActions } from "./sequence-actions";
import { getDunningSequence, deleteDunningStep } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDunningSequence(id);
  return {
    title:
      result.success
        ? `${result.data.name} | Dunning | Slipwise`
        : "Sequence | Dunning | Slipwise",
  };
}

const TONE_COLORS: Record<string, string> = {
  FRIENDLY: "bg-green-50 text-green-700",
  POLITE: "bg-blue-50 text-blue-700",
  FIRM: "bg-yellow-50 text-yellow-700",
  URGENT: "bg-orange-50 text-orange-700",
  ESCALATE: "bg-red-50 text-red-700",
};

async function SequenceDetail({ id }: { id: string }) {
  const result = await getDunningSequence(id);

  if (!result.success) notFound();

  const sequence = result.data;
  const nextStepNumber =
    sequence.steps.length > 0
      ? Math.max(...sequence.steps.map((s) => s.stepNumber)) + 1
      : 1;

  return (
    <div className="space-y-6">
      {/* Sequence Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {sequence.name}
              </h2>
              <Badge variant={sequence.isActive ? "success" : "default"}>
                {sequence.isActive ? "Active" : "Inactive"}
              </Badge>
              {sequence.isDefault && (
                <Badge variant="warning">Default</Badge>
              )}
            </div>
            <SequenceActions
              sequenceId={sequence.id}
              isActive={sequence.isActive}
              isDefault={sequence.isDefault}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Steps */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Steps ({sequence.steps.length})
        </h3>

        {sequence.steps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center mb-6">
            <p className="text-sm text-slate-500">
              No steps yet. Add your first step below.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {sequence.steps.map((step) => (
              <Card key={step.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {step.stepNumber}
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          Day +{step.daysOffset}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] ${TONE_COLORS[step.tone] || "bg-slate-100 text-slate-700"}`}
                        >
                          {step.tone}
                        </span>
                        {step.channels.map((ch) => (
                          <span
                            key={ch}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-600 uppercase"
                          >
                            {ch}
                          </span>
                        ))}
                        {step.createTicket && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-purple-700 uppercase">
                            Ticket
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Subject:</span>{" "}
                        {step.emailSubject}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {step.emailBody}
                      </p>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await deleteDunningStep(step.id);
                      }}
                    >
                      <Button variant="ghost" size="sm" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Step Form */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900">
            Add Step {nextStepNumber}
          </h3>
        </CardHeader>
        <CardContent>
          <DunningStepForm
            sequenceId={sequence.id}
            nextStepNumber={nextStepNumber}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/app/pay/dunning"
          className="hover:text-slate-700 transition-colors"
        >
          Dunning
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-900 font-medium">Sequence Detail</span>
      </nav>

      <Suspense
        fallback={
          <div className="py-8 text-center text-slate-500">
            Loading sequence…
          </div>
        }
      >
        <SequenceDetail id={id} />
      </Suspense>
    </div>
  );
}
