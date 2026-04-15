import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOrgContext } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { getInsightDetail } from "@/lib/intel/insights";
import { acknowledgeAnomalyAction, dismissAnomalyAction, resolveAnomalyAction } from "../actions";

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-700 bg-red-50 border-red-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-yellow-700 bg-yellow-50 border-yellow-200",
  LOW: "text-blue-700 bg-blue-50 border-blue-200",
  INFO: "text-gray-600 bg-gray-50 border-gray-200",
};

export default async function AnomalyDetailPage({ params }: { params: Promise<{ anomalyId: string }> }) {
  const { anomalyId } = await params;
  const ctx = await getOrgContext();
  if (!ctx) redirect("/sign-in");

  const plan = await getOrgPlan(ctx.orgId);
  if (!plan.limits.anomalyDetection) redirect("/app/intel/anomalies");

  const anomaly = await getInsightDetail(ctx.orgId, anomalyId);
  if (!anomaly) notFound();

  const evidence =
    anomaly.evidence != null && typeof anomaly.evidence === "object" ? anomaly.evidence : null;
  const isActive = anomaly.status === "ACTIVE" || anomaly.status === "ACKNOWLEDGED";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/app/intel/anomalies" className="text-sm text-indigo-600 hover:underline">
        ← Back to Anomaly Detection
      </Link>

      {/* Title block */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded border ${SEVERITY_COLOR[anomaly.severity] ?? ""}`}
          >
            {anomaly.severity}
          </span>
          <span className="text-xs text-gray-400">{anomaly.category} · {anomaly.status}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{anomaly.title}</h1>
        <p className="text-gray-600 mt-1">{anomaly.summary}</p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">First detected:</span>{" "}
          <span>{new Date(anomaly.firstDetectedAt).toLocaleString("en-IN")}</span>
        </div>
        <div>
          <span className="text-gray-500">Last detected:</span>{" "}
          <span>{new Date(anomaly.lastDetectedAt).toLocaleString("en-IN")}</span>
        </div>
        {anomaly.expiresAt && (
          <div>
            <span className="text-gray-500">Expires:</span>{" "}
            <span>{new Date(anomaly.expiresAt).toLocaleString("en-IN")}</span>
          </div>
        )}
        {anomaly.recommendedActionType && (
          <div>
            <span className="text-gray-500">Recommended action:</span>{" "}
            <span className="text-indigo-700">
              {anomaly.recommendedActionType.replace(/_/g, " ")}
            </span>
          </div>
        )}
        {anomaly.assignedRole && (
          <div>
            <span className="text-gray-500">Assigned to role:</span>{" "}
            <span>{anomaly.assignedRole}</span>
          </div>
        )}
        {anomaly.sourceRecordType && (
          <div>
            <span className="text-gray-500">Source record type:</span>{" "}
            <span>{anomaly.sourceRecordType}</span>
          </div>
        )}
      </div>

      {/* Evidence */}
      {evidence != null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Evidence</h3>
          <pre className="text-xs text-gray-600 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(evidence, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <div className="flex gap-3">
          {anomaly.status === "ACTIVE" && (
            <form
              action={async () => {
                "use server";
                await acknowledgeAnomalyAction(anomalyId);
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Acknowledge
              </button>
            </form>
          )}
          <form
            action={async () => {
              "use server";
              await resolveAnomalyAction(anomalyId);
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Mark Resolved
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await dismissAnomalyAction(anomalyId, "Manually dismissed");
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Dismiss
            </button>
          </form>
        </div>
      )}

      {/* Lifecycle events */}
      {anomaly.events.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity Log</h3>
          <div className="space-y-1">
            {anomaly.events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-mono text-gray-400">
                  {new Date(ev.createdAt).toLocaleString("en-IN")}
                </span>
                <span className="font-medium text-gray-700">{ev.eventType}</span>
                {ev.actorLabel && <span>by {ev.actorLabel}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
