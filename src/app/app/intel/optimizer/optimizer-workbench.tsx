"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  generateOptimizationPlanAction,
  getCustomerBehaviorScoresAction,
  getDSOAction,
  evaluateCashFlowAlertsAction,
  getAlertConfigAction,
  updateAlertConfigAction,
} from "./actions";
import type {
  PaymentOptimizationPlan,
  CustomerBehaviorScore,
  DSOResult,
  CashFlowAlert,
} from "@/lib/intel/optimizer";

type TabId = "recommendations" | "behavior" | "alerts";

export function OptimizerWorkbench() {
  const [activeTab, setActiveTab] = useState<TabId>("recommendations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recommendation state
  const [plan, setPlan] = useState<PaymentOptimizationPlan | null>(null);

  // Behavior state
  const [scores, setScores] = useState<CustomerBehaviorScore[]>([]);
  const [dso, setDso] = useState<DSOResult | null>(null);

  // Alert state
  const [alerts, setAlerts] = useState<CashFlowAlert[]>([]);
  const [liquidityTarget, setLiquidityTarget] = useState(20);

  useEffect(() => {
    async function loadConfig() {
      const result = await getAlertConfigAction();
      if (result.success) {
        setLiquidityTarget(result.data.liquidityTargetPct);
      }
    }
    loadConfig();
  }, []);

  async function generatePlan() {
    setLoading(true);
    setError(null);
    const result = await generateOptimizationPlanAction();
    if (result.success) {
      setPlan(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function loadBehaviorScores() {
    setLoading(true);
    setError(null);
    const [scoresResult, dsoResult] = await Promise.all([
      getCustomerBehaviorScoresAction(),
      getDSOAction(),
    ]);
    if (scoresResult.success) setScores(scoresResult.data);
    else setError(scoresResult.error);
    if (dsoResult.success) setDso(dsoResult.data);
    setLoading(false);
  }

  async function loadAlerts() {
    setLoading(true);
    setError(null);
    const result = await evaluateCashFlowAlertsAction();
    if (result.success) setAlerts(result.data);
    else setError(result.error);
    setLoading(false);
  }

  async function saveLiquidityTarget() {
    const result = await updateAlertConfigAction({
      liquidityTargetPct: liquidityTarget,
    });
    if (!result.success) setError(result.error);
  }

  const actionColorMap: Record<string, string> = {
    PAY_NOW_DISCOUNT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PAY_BY_DUE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    DEFER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    PARTIAL: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  const classificationColorMap: Record<string, string> = {
    RELIABLE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MODERATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    AT_RISK: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    CHRONIC: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const severityColorMap: Record<string, string> = {
    CRITICAL: "border-l-4 border-red-500 bg-red-50 dark:bg-red-950",
    HIGH: "border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950",
    MEDIUM: "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950",
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {(
          [
            { id: "recommendations", label: "Payment Recommendations" },
            { id: "behavior", label: "Customer Behavior" },
            { id: "alerts", label: "Cash-Flow Alerts" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={generatePlan} disabled={loading}>
              {loading ? "Analyzing…" : "Generate Optimization Plan"}
            </Button>
            {plan && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  Balance: ₹{plan.currentBalance.toLocaleString("en-IN")}
                </span>
                <span>
                  Projected Inflows: ₹
                  {plan.projectedInflows30d.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {plan && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Discount Capture Rate</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {plan.discountCaptureRate.toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Total Savings Recommended</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{plan.totalDiscountRecommended.toLocaleString("en-IN")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Bills Analyzed</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {plan.recommendations.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations Table */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Payment Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Recommended actions sorted by priority.
                  </p>
                </CardHeader>
                <CardContent>
                  {plan.recommendations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No unpaid bills to optimize.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 pr-4">Vendor</th>
                            <th className="pb-2 pr-4 text-right">Amount Due</th>
                            <th className="pb-2 pr-4">Due Date</th>
                            <th className="pb-2 pr-4">Action</th>
                            <th className="pb-2 pr-4">Pay By</th>
                            <th className="pb-2 pr-4 text-right">Savings</th>
                            <th className="pb-2">Reasoning</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.recommendations.map((rec) => (
                            <tr key={rec.vendorBillId} className="border-b">
                              <td className="py-2 pr-4 font-medium">
                                {rec.vendorName}
                              </td>
                              <td className="py-2 pr-4 text-right">
                                ₹{rec.amountDue.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2 pr-4">{rec.dueDate}</td>
                              <td className="py-2 pr-4">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${actionColorMap[rec.recommendedAction] ?? ""}`}
                                >
                                  {rec.recommendedAction.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                {rec.recommendedPayDate}
                              </td>
                              <td className="py-2 pr-4 text-right text-green-600">
                                {rec.savingsIfFollowed > 0
                                  ? `₹${rec.savingsIfFollowed.toLocaleString("en-IN")}`
                                  : "—"}
                              </td>
                              <td className="py-2 text-muted-foreground">
                                {rec.reasoning}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Behavior Tab */}
      {activeTab === "behavior" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={loadBehaviorScores} disabled={loading}>
              {loading ? "Analyzing…" : "Compute Behavior Scores"}
            </Button>
            {dso && (
              <span className="text-sm text-muted-foreground">
                DSO: <strong>{dso.dso.toFixed(1)} days</strong> (AR: ₹
                {dso.accountsReceivable.toLocaleString("en-IN")})
              </span>
            )}
          </div>

          {scores.length > 0 && (
            <>
              {/* Distribution Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(["RELIABLE", "MODERATE", "AT_RISK", "CHRONIC"] as const).map(
                  (cls) => {
                    const count = scores.filter(
                      (s) => s.classification === cls
                    ).length;
                    return (
                      <Card key={cls}>
                        <CardHeader className="pb-2">
                          <p className="text-sm text-muted-foreground">{cls}</p>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">{count}</p>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>

              {/* Scores Table */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Customer Payment Behavior</h3>
                  <p className="text-sm text-muted-foreground">
                    Sorted by score (lowest first — highest risk).
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">Customer</th>
                          <th className="pb-2 pr-4 text-right">Score</th>
                          <th className="pb-2 pr-4">Classification</th>
                          <th className="pb-2 pr-4 text-right">
                            Median Days to Pay
                          </th>
                          <th className="pb-2 pr-4 text-right">Consistency</th>
                          <th className="pb-2 pr-4 text-right">Invoices</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((s) => (
                          <tr key={s.customerId} className="border-b">
                            <td className="py-2 pr-4 font-medium">
                              {s.customerName}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {s.score.toFixed(2)}
                            </td>
                            <td className="py-2 pr-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classificationColorMap[s.classification] ?? ""}`}
                              >
                                {s.classification}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {s.paymentVelocity.toFixed(0)}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {(s.consistencyScore * 100).toFixed(0)}%
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {s.invoiceCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={loadAlerts} disabled={loading}>
              {loading ? "Checking…" : "Evaluate Alerts"}
            </Button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                Liquidity Target:
              </label>
              <input
                type="range"
                min={5}
                max={50}
                value={liquidityTarget}
                onChange={(e) =>
                  setLiquidityTarget(Number(e.target.value))
                }
                className="w-32"
              />
              <span className="text-sm font-medium">{liquidityTarget}%</span>
              <Button variant="secondary" size="sm" onClick={saveLiquidityTarget}>
                Save
              </Button>
            </div>
          </div>

          {alerts.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active alerts. Your cash flow is healthy! 🎉
              </CardContent>
            </Card>
          )}

          {alerts.map((alert, i) => (
            <div
              key={`${alert.type}-${i}`}
              className={`p-4 rounded-lg ${severityColorMap[alert.severity] ?? ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {alert.severity}
                    </span>
                    <h3 className="font-semibold">{alert.title}</h3>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {alert.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
