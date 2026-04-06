export type PlanId = "free" | "starter" | "pro" | "enterprise";
export type BillingInterval = "monthly" | "yearly";

export interface PlanLimits {
  invoicesPerMonth: number;
  vouchersPerMonth: number;
  salarySlipsPerMonth: number;
  storageBytes: number;
  teamMembers: number;
  customersVendors: number;
  pdfExportsPerMonth: number;
  emailSendsPerMonth: number;
  recurringRules: number;
  reportSnapshots: number;
  // Feature flags
  customBranding: boolean;
  approvalWorkflows: boolean;
  proxyAccess: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  auditLogRetentionDays: number;
  pdfStudioTools: boolean;
  pixelPassportPhotos: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceInr: number; // in paise (₹999 = 99900)
  yearlyPriceInr: number; // in paise (₹9,990 = 999000 — 2 months free)
  razorpayMonthlyPlanId?: string; // Set via env vars or admin
  razorpayYearlyPlanId?: string;
  limits: PlanLimits;
  popular?: boolean;
  trialDays?: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    invoicesPerMonth: 10,
    vouchersPerMonth: 10,
    salarySlipsPerMonth: 5,
    storageBytes: 100 * 1024 * 1024, // 100 MB
    teamMembers: 1,
    customersVendors: 20,
    pdfExportsPerMonth: 20,
    emailSendsPerMonth: 10,
    recurringRules: 2,
    reportSnapshots: 5,
    customBranding: false,
    approvalWorkflows: false,
    proxyAccess: false,
    apiAccess: false,
    prioritySupport: false,
    auditLogRetentionDays: 7,
    pdfStudioTools: false,
    pixelPassportPhotos: false,
  },
  starter: {
    invoicesPerMonth: 100,
    vouchersPerMonth: 100,
    salarySlipsPerMonth: 50,
    storageBytes: 1024 * 1024 * 1024, // 1 GB
    teamMembers: 5,
    customersVendors: 200,
    pdfExportsPerMonth: 200,
    emailSendsPerMonth: 100,
    recurringRules: 20,
    reportSnapshots: 20,
    customBranding: true,
    approvalWorkflows: false,
    proxyAccess: false,
    apiAccess: false,
    prioritySupport: false,
    auditLogRetentionDays: 30,
    pdfStudioTools: true,
    pixelPassportPhotos: true,
  },
  pro: {
    invoicesPerMonth: 1000,
    vouchersPerMonth: 1000,
    salarySlipsPerMonth: 500,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    teamMembers: 25,
    customersVendors: 2000,
    pdfExportsPerMonth: 2000,
    emailSendsPerMonth: 1000,
    recurringRules: 100,
    reportSnapshots: 100,
    customBranding: true,
    approvalWorkflows: true,
    proxyAccess: true,
    apiAccess: false,
    prioritySupport: true,
    auditLogRetentionDays: 90,
    pdfStudioTools: true,
    pixelPassportPhotos: true,
  },
  enterprise: {
    invoicesPerMonth: -1, // unlimited
    vouchersPerMonth: -1,
    salarySlipsPerMonth: -1,
    storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    teamMembers: -1,
    customersVendors: -1,
    pdfExportsPerMonth: -1,
    emailSendsPerMonth: -1,
    recurringRules: -1,
    reportSnapshots: -1,
    customBranding: true,
    approvalWorkflows: true,
    proxyAccess: true,
    apiAccess: true,
    prioritySupport: true,
    auditLogRetentionDays: 365,
    pdfStudioTools: true,
    pixelPassportPhotos: true,
  },
};

export const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    description: "For freelancers and small businesses getting started",
    monthlyPriceInr: 0,
    yearlyPriceInr: 0,
    limits: PLAN_LIMITS.free,
    trialDays: 0,
  },
  {
    id: "starter",
    name: "Starter",
    description: "For growing businesses with regular document needs",
    monthlyPriceInr: 99900, // ₹999
    yearlyPriceInr: 999000, // ₹9,990 (2 months free)
    limits: PLAN_LIMITS.starter,
    popular: true,
    trialDays: 14,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For established businesses with advanced workflows",
    monthlyPriceInr: 299900, // ₹2,999
    yearlyPriceInr: 2999000, // ₹29,990 (2 months free)
    limits: PLAN_LIMITS.pro,
    trialDays: 14,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPriceInr: 999900, // ₹9,999
    yearlyPriceInr: 9999000, // ₹99,990 (2 months free)
    limits: PLAN_LIMITS.enterprise,
    trialDays: 14,
  },
];

export function getPlan(planId: PlanId): PlanConfig {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0];
}

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
}

export function formatPriceInr(paise: number): string {
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
