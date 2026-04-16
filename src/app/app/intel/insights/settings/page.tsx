import { requireOrgContext } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import {
  isAiGloballyDisabled,
  getUsageSummary,
  checkProviderHealth,
} from "@/lib/ai/governance";

export default async function InsightSettingsPage() {
  const { orgId } = await requireOrgContext();
  const plan = await getOrgPlan(orgId);
  const globallyDisabled = isAiGloballyDisabled();

  const aiEnabled =
    !globallyDisabled &&
    (plan.limits.aiInsights || plan.limits.anomalyDetection || plan.limits.documentIntelligence);

  const [usage, health] = aiEnabled
    ? await Promise.all([getUsageSummary(orgId), checkProviderHealth()])
    : [null, null];

  const aiRunLimit = plan.limits.aiRunsPerMonth;
  const usedThisMonth = usage?.totalRuns ?? 0;
  const remainingRuns =
    aiRunLimit === Infinity ? null : Math.max(0, aiRunLimit - usedThisMonth);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI &amp; Intelligence Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure and monitor AI features for insights, anomaly detection, and document intelligence.
        </p>
      </div>

      {/* Global status */}
      <section className="rounded-lg border p-6 space-y-4">
        <h2 className="text-base font-medium">AI Feature Status</h2>
        {globallyDisabled ? (
          <p className="text-sm text-destructive font-medium">
            ⚠ AI features are globally disabled (AI_DISABLED=true). Contact your administrator.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FeatureGate
              label="AI Insights"
              enabled={plan.limits.aiInsights}
              description="Customer health scoring and collection recommendations"
            />
            <FeatureGate
              label="Anomaly Detection"
              enabled={plan.limits.anomalyDetection}
              description="Deterministic rule-based anomaly monitoring"
            />
            <FeatureGate
              label="Document Intelligence"
              enabled={plan.limits.documentIntelligence}
              description="AI-powered extraction from uploaded documents"
            />
          </div>
        )}
      </section>

      {/* Provider health */}
      {health && (
        <section className="rounded-lg border p-6 space-y-3">
          <h2 className="text-base font-medium">AI Provider Health</h2>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                health.healthy ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium capitalize">{health.provider}</span>
            <span className="text-sm text-muted-foreground">
              {health.healthy
                ? `Healthy${health.latencyMs != null ? ` · ${health.latencyMs}ms` : ""}`
                : health.error ?? "Unavailable"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Last checked: {health.checkedAt.toLocaleString()}
          </p>
        </section>
      )}

      {/* Usage this month */}
      {usage && (
        <section className="rounded-lg border p-6 space-y-3">
          <h2 className="text-base font-medium">AI Usage — This Month</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Runs used</span>
            <span className="font-medium tabular-nums">{usedThisMonth.toLocaleString()}</span>
          </div>
          {remainingRuns !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Runs remaining</span>
              <span className="font-medium tabular-nums">{remainingRuns.toLocaleString()}</span>
            </div>
          )}
          {aiRunLimit === Infinity && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly limit</span>
              <span className="font-medium">Unlimited</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Success rate</span>
            <span className="font-medium tabular-nums">
              {Math.round(usage.successRate * 100)}%
            </span>
          </div>
          {Object.keys(usage.byFeature).length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                By feature
              </p>
              {Object.entries(usage.byFeature).map(([feature, stats]) => (
                <div key={feature} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {feature.replace(/_/g, " ")}
                  </span>
                  <span className="tabular-nums">{stats.runs}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Plan info */}
      <section className="rounded-lg border p-6 space-y-3">
        <h2 className="text-base font-medium">Plan</h2>
        <p className="text-sm text-muted-foreground">
          Your current plan is{" "}
          <span className="font-medium text-foreground capitalize">{plan.planId}</span>.{" "}
          {!plan.limits.aiInsights || !plan.limits.anomalyDetection
            ? "Upgrade to Pro or Enterprise to unlock all AI intelligence features."
            : "All AI intelligence features are available on your plan."}
        </p>
      </section>

      {/* Not enabled state */}
      {!aiEnabled && !globallyDisabled && (
        <section className="rounded-lg border border-dashed p-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            AI intelligence features are not enabled on your current plan.
          </p>
          <p className="text-sm text-muted-foreground">
            Upgrade to Pro or Enterprise to enable AI Insights, Anomaly Detection, and Document Intelligence.
          </p>
        </section>
      )}
    </div>
  );
}

function FeatureGate({
  label,
  enabled,
  description,
}: {
  label: string;
  enabled: boolean;
  description: string;
}) {
  return (
    <div className="rounded-md border p-4 space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${enabled ? "bg-green-500" : "bg-muted-foreground"}`}
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className={`text-xs font-medium ${enabled ? "text-green-600" : "text-muted-foreground"}`}>
        {enabled ? "Enabled" : "Not available on this plan"}
      </p>
    </div>
  );
}
