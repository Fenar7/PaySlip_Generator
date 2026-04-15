import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { listAnomalyInsights, listAnomalyRuns } from "@/lib/intel/anomalies";
import { triggerAnomalyDetectionAction } from "./actions";

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-700 bg-red-50 border-red-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-yellow-700 bg-yellow-50 border-yellow-200",
  LOW: "text-blue-700 bg-blue-50 border-blue-200",
  INFO: "text-gray-600 bg-gray-50 border-gray-200",
};

const CATEGORY_LABEL: Record<string, string> = {
  DOCUMENTS: "Documents",
  RECEIVABLES: "Receivables",
  OPERATIONS: "Operations",
  COMPLIANCE: "Compliance",
  PARTNER: "Partner OS",
  MARKETPLACE: "Marketplace",
  INTEGRATIONS: "Integrations",
  SYSTEM: "System",
  REVENUE: "Revenue",
  PAYROLL: "Payroll",
};

export default async function AnomaliesPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/sign-in");

  const plan = await getOrgPlan(ctx.orgId);
  if (!plan.limits.anomalyDetection) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Anomaly Detection</h2>
        <p className="text-gray-500">
          Operational anomaly detection requires a Pro or Enterprise plan. Upgrade to surface critical
          issues before they become incidents.
        </p>
      </div>
    );
  }

  const [anomalies, recentRuns] = await Promise.all([
    listAnomalyInsights(ctx.orgId),
    listAnomalyRuns(ctx.orgId, 3),
  ]);

  const criticalCount = anomalies.filter((a) => a.severity === "CRITICAL").length;
  const highCount = anomalies.filter((a) => a.severity === "HIGH").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anomaly Detection</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cross-suite operational anomalies detected by deterministic rules
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await triggerAnomalyDetectionAction();
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Run Detection Now
          </button>
        </form>
      </div>

      {/* Summary bar */}
      {(criticalCount > 0 || highCount > 0) && (
        <div className="flex gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          {criticalCount > 0 && (
            <span className="text-sm font-semibold text-red-700">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-sm font-semibold text-orange-700">
              {highCount} High
            </span>
          )}
          <span className="text-sm text-gray-600">— requires immediate attention</span>
        </div>
      )}

      {/* Anomaly list */}
      {anomalies.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No active anomalies</p>
          <p className="text-sm mt-1">Run detection to check current operational health.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly) => (
            <a
              key={anomaly.id}
              href={`/app/intel/anomalies/${anomaly.id}`}
              className="block rounded-lg border p-4 hover:shadow-sm transition-shadow bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${SEVERITY_COLOR[anomaly.severity] ?? ""}`}
                    >
                      {anomaly.severity}
                    </span>
                    <span className="text-xs text-gray-400">
                      {CATEGORY_LABEL[anomaly.category] ?? anomaly.category}
                    </span>
                    {anomaly.status === "ACKNOWLEDGED" && (
                      <span className="text-xs text-blue-500">Acknowledged</span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 truncate">{anomaly.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{anomaly.summary}</p>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(anomaly.lastDetectedAt).toLocaleDateString("en-IN")}
                </div>
              </div>
              {anomaly.recommendedActionType && (
                <div className="mt-2 text-xs text-indigo-600">
                  → Recommended: {anomaly.recommendedActionType.replace(/_/g, " ")}
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Detection Runs</h3>
          <div className="space-y-1">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-3 text-xs text-gray-500">
                <span
                  className={run.status === "COMPLETED" ? "text-green-600" : run.status === "PARTIAL" ? "text-yellow-600" : "text-gray-400"}
                >
                  {run.status}
                </span>
                <span>{new Date(run.startedAt).toLocaleString("en-IN")}</span>
                <span>{run.rulesEvaluated} rules · {run.insightsCreated} insights</span>
                {run.errorMessage && (
                  <span className="text-red-500 truncate max-w-xs">{run.errorMessage}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
