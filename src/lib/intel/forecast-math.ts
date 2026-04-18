/**
 * Pure mathematical functions for financial forecasting.
 *
 * No "server-only" import — these are pure, testable computations.
 * All monetary values are in the org's baseCurrency minor unit (paise/cents).
 * Internally we operate on floats and round only at output boundaries.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyAggregate {
  /** ISO month key: "2026-01" */
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface ForecastMonth {
  month: string;
  predictedInflow: number;
  predictedOutflow: number;
  predictedNet: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface RunRateMetrics {
  /** Monthly Recurring Revenue (average of last 3 settled months) */
  mrr: number;
  /** Annualized run rate */
  arr: number;
  /** Month-over-month growth rate (fraction, not percent) */
  momGrowth: number | null;
}

export interface SpendingAnomaly {
  month: string;
  type: "INFLOW" | "OUTFLOW";
  actual: number;
  mean: number;
  stddev: number;
  zScore: number;
}

// ─── EMA (Exponential Moving Average) ─────────────────────────────────────────

/**
 * Compute EMA over a series of values.
 * alpha ∈ (0, 1] — higher means more weight on recent values.
 * Returns an array of the same length, where ema[0] = values[0].
 */
export function ema(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  if (alpha <= 0 || alpha > 1) throw new RangeError("alpha must be in (0, 1]");

  const result = new Array<number>(values.length);
  result[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    result[i] = alpha * values[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

// ─── Linear Regression ────────────────────────────────────────────────────────

export interface RegressionResult {
  slope: number;
  intercept: number;
  /** R² goodness-of-fit [0, 1] */
  rSquared: number;
}

/**
 * Ordinary Least Squares linear regression: y = slope * x + intercept.
 * x values are 0-indexed integers (months in sequence).
 */
export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

// ─── Forecasting ──────────────────────────────────────────────────────────────

/**
 * Generate N months of forecast projections using an ensemble of EMA and
 * linear regression. Confidence bands use residual standard error.
 *
 * The ensemble weights regression more when R² is high.
 */
export function generateProjections(
  historical: MonthlyAggregate[],
  horizonMonths: number,
  alpha: number = 0.5,
): ForecastMonth[] {
  if (historical.length < 2 || horizonMonths < 1) return [];

  const inflows = historical.map((h) => h.inflow);
  const outflows = historical.map((h) => h.outflow);

  const emaIn = ema(inflows, alpha);
  const emaOut = ema(outflows, alpha);

  const regIn = linearRegression(inflows);
  const regOut = linearRegression(outflows);

  // Weight the regression vs EMA by R²
  const wIn = Math.min(regIn.rSquared, 0.8);
  const wOut = Math.min(regOut.rSquared, 0.8);

  // Residual standard error for confidence bands
  const rseIn = residualStdError(inflows, regIn);
  const rseOut = residualStdError(outflows, regOut);

  const lastMonth = historical[historical.length - 1].month;
  const projections: ForecastMonth[] = [];
  const n = historical.length;

  for (let f = 1; f <= horizonMonths; f++) {
    const fMonth = addMonths(lastMonth, f);
    const idx = n - 1 + f;

    // Regression prediction
    const regPredIn = Math.max(0, regIn.slope * idx + regIn.intercept);
    const regPredOut = Math.max(0, regOut.slope * idx + regOut.intercept);

    // EMA last value (carries forward)
    const emaPredIn = Math.max(0, emaIn[emaIn.length - 1]);
    const emaPredOut = Math.max(0, emaOut[emaOut.length - 1]);

    // Ensemble: weighted blend
    const predictedInflow = round2(wIn * regPredIn + (1 - wIn) * emaPredIn);
    const predictedOutflow = round2(wOut * regPredOut + (1 - wOut) * emaPredOut);
    const predictedNet = round2(predictedInflow - predictedOutflow);

    // 95% confidence (1.96σ) widening with horizon
    const bandIn = 1.96 * rseIn * Math.sqrt(f);
    const bandOut = 1.96 * rseOut * Math.sqrt(f);
    const confidenceLow = round2(predictedNet - bandIn - bandOut);
    const confidenceHigh = round2(predictedNet + bandIn + bandOut);

    projections.push({
      month: fMonth,
      predictedInflow,
      predictedOutflow,
      predictedNet,
      confidenceLow,
      confidenceHigh,
    });
  }

  return projections;
}

// ─── Run Rate ─────────────────────────────────────────────────────────────────

/**
 * Calculate MRR, ARR, and month-over-month growth from historical data.
 * Uses the last 3 months to compute MRR for stability.
 */
export function computeRunRate(historical: MonthlyAggregate[]): RunRateMetrics {
  if (historical.length === 0) return { mrr: 0, arr: 0, momGrowth: null };

  const recent = historical.slice(-3);
  const mrr = round2(recent.reduce((sum, m) => sum + m.inflow, 0) / recent.length);
  const arr = round2(mrr * 12);

  let momGrowth: number | null = null;
  if (historical.length >= 2) {
    const prev = historical[historical.length - 2].inflow;
    const curr = historical[historical.length - 1].inflow;
    if (prev > 0) {
      momGrowth = round4((curr - prev) / prev);
    }
  }

  return { mrr, arr, momGrowth };
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

/**
 * Detect spending anomalies using z-score (2σ threshold).
 * Returns anomalies found in the historical data.
 */
export function detectAnomalies(
  historical: MonthlyAggregate[],
  sigmaThreshold: number = 2,
): SpendingAnomaly[] {
  if (historical.length < 4) return []; // Need enough data for meaningful stats

  const anomalies: SpendingAnomaly[] = [];

  for (const type of ["INFLOW", "OUTFLOW"] as const) {
    const values = historical.map((h) => (type === "INFLOW" ? h.inflow : h.outflow));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    if (stddev < 1) continue; // No meaningful variation

    for (let i = 0; i < values.length; i++) {
      const zScore = (values[i] - mean) / stddev;
      if (Math.abs(zScore) >= sigmaThreshold) {
        anomalies.push({
          month: historical[i].month,
          type,
          actual: values[i],
          mean: round2(mean),
          stddev: round2(stddev),
          zScore: round4(zScore),
        });
      }
    }
  }

  return anomalies;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function residualStdError(values: number[], reg: RegressionResult): number {
  const n = values.length;
  if (n < 3) return 0;
  let sumSqRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = reg.slope * i + reg.intercept;
    sumSqRes += (values[i] - predicted) ** 2;
  }
  return Math.sqrt(sumSqRes / (n - 2));
}

/** Add months to an ISO month key ("2026-01") → "2026-04" */
export function addMonths(monthKey: string, count: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + count;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** Round to 2 decimal places */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 4 decimal places */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
