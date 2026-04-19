import { describe, it, expect } from "vitest";
import {
  computeOptimizationPlan,
  computeBehaviorScore,
  computeDSO,
  adjustDunningInterval,
  evaluateAlerts,
  type BillInput,
  type CustomerPaymentHistory,
  type AlertInputs,
} from "../optimizer";

// ─── Payment Optimizer ──────────────────────────────────────────────────────

describe("computeOptimizationPlan", () => {
  const today = new Date("2025-06-01");

  it("returns empty recommendations for 0 bills", () => {
    const plan = computeOptimizationPlan("org1", [], 100000, 50000, 20000, today);
    expect(plan.recommendations).toHaveLength(0);
    expect(plan.totalDiscountCapturable).toBe(0);
    expect(plan.totalDiscountRecommended).toBe(0);
    expect(plan.discountCaptureRate).toBe(0);
  });

  it("recommends PAY_NOW_DISCOUNT when funds are sufficient", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Acme Supplies",
        amountDue: 10000,
        dueDate: "2025-06-30",
        discountPct: 2,
        discountDeadline: "2025-06-10",
      },
    ];
    const plan = computeOptimizationPlan("org1", bills, 50000, 20000, 10000, today);
    expect(plan.recommendations).toHaveLength(1);
    expect(plan.recommendations[0].recommendedAction).toBe("PAY_NOW_DISCOUNT");
    expect(plan.recommendations[0].savingsIfFollowed).toBe(200);
    expect(plan.totalDiscountCapturable).toBe(200);
    expect(plan.totalDiscountRecommended).toBe(200);
    expect(plan.discountCaptureRate).toBe(100);
  });

  it("defers discount when funds are insufficient", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Expensive Corp",
        amountDue: 200000,
        dueDate: "2025-06-30",
        discountPct: 3,
        discountDeadline: "2025-06-10",
      },
    ];
    const plan = computeOptimizationPlan("org1", bills, 5000, 2000, 3000, today);
    expect(plan.recommendations[0].recommendedAction).toBe("DEFER");
    expect(plan.totalDiscountCapturable).toBe(6000);
    expect(plan.totalDiscountRecommended).toBe(0);
    expect(plan.discountCaptureRate).toBe(0);
  });

  it("respects liquidity target", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Vendor A",
        amountDue: 50000,
        dueDate: "2025-06-30",
        discountPct: 2,
        discountDeadline: "2025-06-10",
      },
    ];
    // balance=60000 + inflows=10000 - target=25000 = 45000 available
    // discounted amount = 50000 * 0.98 = 49000 > 45000
    const plan = computeOptimizationPlan("org1", bills, 60000, 10000, 25000, today);
    expect(plan.recommendations[0].recommendedAction).toBe("PAY_BY_DUE");
  });

  it("sorts discount bills by discount value (greedy)", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Small",
        amountDue: 1000,
        dueDate: "2025-06-30",
        discountPct: 5,
        discountDeadline: "2025-06-10",
      },
      {
        vendorBillId: "vb2",
        vendorName: "Large",
        amountDue: 100000,
        dueDate: "2025-06-30",
        discountPct: 2,
        discountDeadline: "2025-06-10",
      },
    ];
    const plan = computeOptimizationPlan("org1", bills, 200000, 50000, 10000, today);
    // vb2 has 2000 discount vs vb1 has 50 discount → vb2 should be recommended first
    expect(plan.recommendations[0].vendorBillId).toBe("vb2");
    expect(plan.recommendations[1].vendorBillId).toBe("vb1");
    expect(plan.discountCaptureRate).toBe(100);
  });

  it("handles mixed discount and non-discount bills", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Discount Vendor",
        amountDue: 10000,
        dueDate: "2025-06-30",
        discountPct: 2,
        discountDeadline: "2025-06-10",
      },
      {
        vendorBillId: "vb2",
        vendorName: "Regular Vendor",
        amountDue: 5000,
        dueDate: "2025-06-15",
        discountPct: 0,
        discountDeadline: null,
      },
    ];
    const plan = computeOptimizationPlan("org1", bills, 100000, 0, 10000, today);
    expect(plan.recommendations).toHaveLength(2);
    expect(plan.recommendations[0].recommendedAction).toBe("PAY_NOW_DISCOUNT");
    expect(plan.recommendations[1].recommendedAction).toBe("PAY_BY_DUE");
  });

  it("recommends PARTIAL when some funds available", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Big Vendor",
        amountDue: 50000,
        dueDate: "2025-06-15",
        discountPct: 0,
        discountDeadline: null,
      },
    ];
    // available = 10000 + 5000 - 12000 = 3000 < 50000 but > 0
    const plan = computeOptimizationPlan("org1", bills, 10000, 5000, 12000, today);
    expect(plan.recommendations[0].recommendedAction).toBe("PARTIAL");
  });

  it("ignores expired discount deadlines", () => {
    const bills: BillInput[] = [
      {
        vendorBillId: "vb1",
        vendorName: "Expired Vendor",
        amountDue: 10000,
        dueDate: "2025-06-30",
        discountPct: 5,
        discountDeadline: "2025-05-30", // before today
      },
    ];
    const plan = computeOptimizationPlan("org1", bills, 100000, 0, 10000, today);
    // Should treat as non-discount bill
    expect(plan.recommendations[0].recommendedAction).toBe("PAY_BY_DUE");
    expect(plan.totalDiscountCapturable).toBe(0);
  });
});

// ─── Behavior Scoring ───────────────────────────────────────────────────────

describe("computeBehaviorScore", () => {
  it("returns CHRONIC for customer with no paid invoices", () => {
    const history: CustomerPaymentHistory = {
      customerId: "c1",
      customerName: "Deadbeat Corp",
      invoices: [
        { invoiceId: "i1", issuedAt: new Date("2025-01-01"), paidAt: null, totalAmount: 10000, daysToPayTerms: 30 },
      ],
      reminders: [],
    };
    const result = computeBehaviorScore(history);
    expect(result.classification).toBe("CHRONIC");
    expect(result.score).toBe(0);
  });

  it("returns RELIABLE for consistently fast payer with good reminder response", () => {
    const history: CustomerPaymentHistory = {
      customerId: "c2",
      customerName: "GoodPay Ltd",
      invoices: Array.from({ length: 12 }, (_, i) => ({
        invoiceId: `i${i}`,
        issuedAt: new Date(`2024-${String(i + 1).padStart(2, "0")}-01`),
        paidAt: new Date(`2024-${String(i + 1).padStart(2, "0")}-05`),
        totalAmount: 10000,
        daysToPayTerms: 30,
      })),
      reminders: [
        { sentAt: new Date("2024-03-02"), paymentWithin3Days: true, wasEscalation: false, paymentAfterEscalation: false },
        { sentAt: new Date("2024-06-02"), paymentWithin3Days: true, wasEscalation: false, paymentAfterEscalation: false },
        { sentAt: new Date("2024-09-02"), paymentWithin3Days: true, wasEscalation: true, paymentAfterEscalation: true },
      ],
    };
    const result = computeBehaviorScore(history);
    expect(result.classification).toBe("RELIABLE");
    expect(result.score).toBeGreaterThan(0.8);
    expect(result.paymentVelocity).toBe(4);
  });

  it("returns AT_RISK for moderately slow payer", () => {
    const history: CustomerPaymentHistory = {
      customerId: "c3",
      customerName: "SlowPay Inc",
      invoices: [
        { invoiceId: "i1", issuedAt: new Date("2024-01-01"), paidAt: new Date("2024-03-20"), totalAmount: 10000, daysToPayTerms: 30 },
        { invoiceId: "i2", issuedAt: new Date("2024-04-01"), paidAt: new Date("2024-05-20"), totalAmount: 10000, daysToPayTerms: 30 },
        { invoiceId: "i3", issuedAt: new Date("2024-07-01"), paidAt: new Date("2024-09-15"), totalAmount: 10000, daysToPayTerms: 30 },
        { invoiceId: "i4", issuedAt: new Date("2024-10-01"), paidAt: new Date("2024-11-25"), totalAmount: 10000, daysToPayTerms: 30 },
      ],
      reminders: [
        { sentAt: new Date("2024-02-01"), paymentWithin3Days: false, wasEscalation: false, paymentAfterEscalation: false },
        { sentAt: new Date("2024-04-20"), paymentWithin3Days: false, wasEscalation: false, paymentAfterEscalation: false },
        { sentAt: new Date("2024-07-30"), paymentWithin3Days: false, wasEscalation: true, paymentAfterEscalation: false },
        { sentAt: new Date("2024-10-30"), paymentWithin3Days: false, wasEscalation: true, paymentAfterEscalation: false },
      ],
    };
    const result = computeBehaviorScore(history);
    expect(result.classification).toBe("AT_RISK");
    expect(result.score).toBeGreaterThanOrEqual(0.2);
    expect(result.score).toBeLessThan(0.5);
  });

  it("handles neutral scores when no reminders sent (MODERATE)", () => {
    const history: CustomerPaymentHistory = {
      customerId: "c4",
      customerName: "Average Corp",
      invoices: Array.from({ length: 6 }, (_, i) => ({
        invoiceId: `i${i}`,
        issuedAt: new Date(`2024-${String(i + 1).padStart(2, "0")}-01`),
        paidAt: new Date(`2024-${String(i + 1).padStart(2, "0")}-20`),
        totalAmount: 5000,
        daysToPayTerms: 30,
      })),
      reminders: [],
    };
    const result = computeBehaviorScore(history);
    // With no reminders, neutral 0.5 caps max score at ~0.79 → MODERATE
    expect(result.responseToReminders).toBe(0.5);
    expect(result.escalationSensitivity).toBe(0.5);
    expect(result.classification).toBe("MODERATE");
  });
});

// ─── DSO ────────────────────────────────────────────────────────────────────

describe("computeDSO", () => {
  it("computes DSO correctly", () => {
    const result = computeDSO(150000, 500000, 30);
    expect(result.dso).toBe(9);
  });

  it("returns 0 when no revenue", () => {
    const result = computeDSO(150000, 0, 30);
    expect(result.dso).toBe(0);
  });

  it("handles proportional DSO", () => {
    const result = computeDSO(100000, 200000, 90);
    expect(result.dso).toBe(45);
  });
});

// ─── Dunning Interval Adjustment ────────────────────────────────────────────

describe("adjustDunningInterval", () => {
  it("delays RELIABLE by 50%", () => {
    expect(adjustDunningInterval(10, "RELIABLE")).toBe(15);
  });

  it("keeps MODERATE unchanged", () => {
    expect(adjustDunningInterval(10, "MODERATE")).toBe(10);
  });

  it("accelerates AT_RISK by 25%", () => {
    expect(adjustDunningInterval(10, "AT_RISK")).toBe(8);
  });

  it("accelerates CHRONIC by 75%", () => {
    expect(adjustDunningInterval(10, "CHRONIC")).toBe(3);
  });

  it("never returns less than 1 day for CHRONIC", () => {
    expect(adjustDunningInterval(1, "CHRONIC")).toBe(1);
  });
});

// ─── Cash-Flow Alerts ───────────────────────────────────────────────────────

describe("evaluateAlerts", () => {
  const today = new Date("2025-06-01T12:00:00Z");

  const baseInputs: AlertInputs = {
    currentBalance: 100000,
    liquidityTarget: 80000,
    actualInflow30d: 50000,
    forecastedInflow30d: 50000,
    bills: [],
    dsoCurrent: 30,
    dsoPriorMonth: 30,
    daysSinceLastPaymentReceived: 3,
  };

  it("returns no alerts when everything is healthy", () => {
    const alerts = evaluateAlerts(baseInputs, today);
    expect(alerts).toHaveLength(0);
  });

  it("fires CASH_BELOW_TARGET when balance below target", () => {
    const alerts = evaluateAlerts(
      { ...baseInputs, currentBalance: 70000 },
      today
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("CASH_BELOW_TARGET");
    expect(alerts[0].severity).toBe("CRITICAL");
  });

  it("fires FORECAST_DEVIATION when inflow is significantly below forecast", () => {
    const alerts = evaluateAlerts(
      { ...baseInputs, actualInflow30d: 30000, forecastedInflow30d: 50000 },
      today
    );
    const deviationAlert = alerts.find((a) => a.type === "FORECAST_DEVIATION");
    expect(deviationAlert).toBeDefined();
    expect(deviationAlert!.severity).toBe("HIGH");
  });

  it("does not fire FORECAST_DEVIATION within threshold", () => {
    // 45000 is 90% of 50000 → only 10% deviation, below 20% threshold
    const alerts = evaluateAlerts(
      { ...baseInputs, actualInflow30d: 45000, forecastedInflow30d: 50000 },
      today
    );
    expect(alerts.find((a) => a.type === "FORECAST_DEVIATION")).toBeUndefined();
  });

  it("fires LARGE_OUTFLOW_PENDING for big bill due within 7 days", () => {
    const alerts = evaluateAlerts(
      {
        ...baseInputs,
        bills: [
          {
            vendorBillId: "vb1",
            vendorName: "MegaCorp",
            totalAmount: 30000, // 30% of 100000 balance
            dueDate: "2025-06-05",
            discountDeadline: null,
            discountPct: 0,
          },
        ],
      },
      today
    );
    const outflowAlert = alerts.find((a) => a.type === "LARGE_OUTFLOW_PENDING");
    expect(outflowAlert).toBeDefined();
    expect(outflowAlert!.severity).toBe("HIGH");
  });

  it("fires DISCOUNT_EXPIRING for imminent discount deadline", () => {
    const alerts = evaluateAlerts(
      {
        ...baseInputs,
        bills: [
          {
            vendorBillId: "vb1",
            vendorName: "Discount Corp",
            totalAmount: 50000,
            dueDate: "2025-06-30",
            discountDeadline: "2025-06-02", // ~14 hours from now
            discountPct: 3,
          },
        ],
      },
      today
    );
    const discountAlert = alerts.find((a) => a.type === "DISCOUNT_EXPIRING");
    expect(discountAlert).toBeDefined();
    expect(discountAlert!.severity).toBe("MEDIUM");
  });

  it("fires DSO_SPIKE when DSO increases significantly", () => {
    const alerts = evaluateAlerts(
      { ...baseInputs, dsoCurrent: 40, dsoPriorMonth: 30 },
      today
    );
    const dsoAlert = alerts.find((a) => a.type === "DSO_SPIKE");
    expect(dsoAlert).toBeDefined();
    expect(dsoAlert!.severity).toBe("MEDIUM");
  });

  it("fires COLLECTION_STALL when no payments in 7+ days", () => {
    const alerts = evaluateAlerts(
      { ...baseInputs, daysSinceLastPaymentReceived: 10 },
      today
    );
    const stallAlert = alerts.find((a) => a.type === "COLLECTION_STALL");
    expect(stallAlert).toBeDefined();
    expect(stallAlert!.severity).toBe("MEDIUM");
  });

  it("can fire multiple alerts simultaneously", () => {
    const alerts = evaluateAlerts(
      {
        ...baseInputs,
        currentBalance: 50000,
        liquidityTarget: 80000,
        actualInflow30d: 20000,
        forecastedInflow30d: 50000,
        daysSinceLastPaymentReceived: 14,
      },
      today
    );
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    const types = alerts.map((a) => a.type);
    expect(types).toContain("CASH_BELOW_TARGET");
    expect(types).toContain("FORECAST_DEVIATION");
    expect(types).toContain("COLLECTION_STALL");
  });
});
