import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsightDetailAction } from "../actions";

export const metadata: Metadata = { title: "Insight Detail — SW Intel" };

const SEVERITY_CONFIG: Record<string, { label: string; badge: string }> = {
  CRITICAL: { label: "Critical", badge: "bg-red-100 text-red-800 border-red-200" },
  HIGH: { label: "High", badge: "bg-orange-100 text-orange-800 border-orange-200" },
  MEDIUM: { label: "Medium", badge: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  LOW: { label: "Low", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  INFO: { label: "Info", badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ insightId: string }>;
}) {
  const { insightId } = await params;
  const result = await getInsightDetailAction(insightId);

  if (!result.success) {
    if (result.error?.includes("plan")) {
      return (
        <div className="mx-auto max-w-xl py-20 text-center">
          <p className="text-sm text-slate-500">{result.error}</p>
          <Link href="/app/billing" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Upgrade plan
          </Link>
        </div>
      );
    }
    return notFound();
  }

  const insight = result.data;
  if (!insight) return notFound();

  const sevCfg = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.INFO;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/app/intel/insights" className="text-xs text-slate-400 hover:text-slate-600">
          ← Back to Insights
        </Link>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-xl font-semibold text-slate-900">{insight.title}</h1>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sevCfg.badge}`}>
            {sevCfg.label}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
            {insight.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{insight.summary}</p>
      </div>

      {/* Actions */}
      {(insight.status === "ACTIVE" || insight.status === "ACKNOWLEDGED") && (
        <div className="flex flex-wrap gap-2">
          {insight.status === "ACTIVE" && (
            <form action={`/api/insights/${insightId}/acknowledge`} method="POST">
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
              >
                Acknowledge
              </button>
            </form>
          )}
          <form action={`/api/insights/${insightId}/dismiss`} method="POST">
            <button
              type="submit"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              Dismiss
            </button>
          </form>
          <form action={`/api/insights/${insightId}/resolve`} method="POST">
            <button
              type="submit"
              className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
            >
              Mark Resolved
            </button>
          </form>
        </div>
      )}

      {/* Evidence */}
      {insight.evidence != null && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Evidence</h2>
          <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(insight.evidence, null, 2)}
          </pre>
        </section>
      )}

      {/* Metadata */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Category</dt>
          <dd className="font-medium text-slate-800">{insight.category}</dd>
          <dt className="text-slate-500">Source</dt>
          <dd className="font-medium text-slate-800">{insight.sourceType}</dd>
          {insight.sourceRecordType && (
            <>
              <dt className="text-slate-500">Record type</dt>
              <dd className="font-medium text-slate-800">{insight.sourceRecordType}</dd>
            </>
          )}
          {insight.recommendedActionType && (
            <>
              <dt className="text-slate-500">Recommended action</dt>
              <dd className="font-medium text-slate-800">{insight.recommendedActionType}</dd>
            </>
          )}
          <dt className="text-slate-500">First detected</dt>
          <dd className="font-medium text-slate-800">
            {new Date(insight.firstDetectedAt).toLocaleString()}
          </dd>
          <dt className="text-slate-500">Last detected</dt>
          <dd className="font-medium text-slate-800">
            {new Date(insight.lastDetectedAt).toLocaleString()}
          </dd>
          {insight.expiresAt && (
            <>
              <dt className="text-slate-500">Expires at</dt>
              <dd className="font-medium text-slate-800">
                {new Date(insight.expiresAt).toLocaleString()}
              </dd>
            </>
          )}
        </dl>
      </section>

      {/* Event history */}
      {insight.events.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Activity</h2>
          <ol className="space-y-3">
            {insight.events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-400" />
                <div>
                  <span className="font-medium text-slate-700">{ev.eventType}</span>
                  {ev.actorLabel && (
                    <span className="ml-1 text-slate-500">by {ev.actorLabel}</span>
                  )}
                  <span className="ml-2 text-xs text-slate-400">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
