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
  approvalPolicies: boolean;
  approvalPolicyManager: boolean;
  ticketSla: boolean;
  slaPolicyManager: boolean;
  workflowAutomation: boolean;
  workflowBuilderUi: boolean;
  workflowRunHistory: boolean;
  opsControlCenter: boolean;
  proxyAccess: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  auditLogRetentionDays: number;
  pdfStudioTools: boolean;
  pixelPassportPhotos: boolean;
  // Phase 14: Dunning
  dunningSequences: number;        // max sequences per org
  dunningStepsPerSequence: number; // max steps per sequence
  smsReminders: boolean;           // SMS channel in dunning
  // Phase 14: Portal
  customerPortal: boolean;
  portalCustomDomain: boolean;
  accountStatements: boolean;
  // Phase 14: Quotes
  quotesPerMonth: number;
  // Phase 14: Cash Flow Intelligence
  cashFlowForecast: boolean;
  customerHealthScores: boolean;
  // Phase 14: Payment Arrangements
  paymentArrangements: boolean;
  // Phase 15: GST & Tax Compliance
  gstEInvoicing: boolean;
  tdsTracking: boolean;
  gstrExport: boolean;
  // Phase 15: Global Expansion
  multiCurrency: boolean;
  // Phase 16: Books & Close
  accountingCore: boolean;
  bankReconciliation: boolean;
  vendorBills: boolean;
  financialStatements: boolean;
  closeWorkflow: boolean;
  auditPackExports: boolean;
  bankAccounts: number;
  statementImportsPerMonth: number;
  vendorBillsPerMonth: number;
  // Phase 15: Marketplace & Ecosystem
  templatePublish: boolean;
  oauthApps: boolean;
  webhookV2: boolean;
  partnerProgram: boolean;
  // Phase 21: SW Intel
  aiInsights: boolean;
  documentIntelligence: boolean;
  anomalyDetection: boolean;
  /** Max AI provider calls per calendar month (0 = not available) */
  aiRunsPerMonth: number;
  // Phase 23: usage metering
  /** Max concurrently-active portal sessions (0 = not available) */
  activePortalSessions: number;
  /** Max active share bundles at any given time (0 = not available) */
  activeShareBundles: number;
  /** Max pixel jobs saved to the document vault (0 = not available) */
  pixelJobsSaved: number;
  // Phase 25: automation limits
  /** Max concurrently-ACTIVE workflow automations (0 = feature unavailable) */
  activeWorkflowAutomations: number;
  // Phase 26: Multi-Entity & ERP
  /** Whether the org can create/join an EntityGroup */
  multiEntity: boolean;
  /** Max child entities in the group (0 = not available) */
  maxEntitiesPerGroup: number;
  /** Whether inventory management (WMS) is available */
  inventoryManagement: boolean;
  /** Max warehouses per org (0 = not available) */
  maxWarehouses: number;
  /** Whether procurement/AP module is available */
  procurementAp: boolean;
  /** Whether advanced e-invoicing (IRN v2) is available */
  eInvoicingV2: boolean;
  /** Whether enterprise CRM module is available */
  enterpriseCrm: boolean;
  /** Whether the SOP knowledge base is available */
  sopKnowledgeBase: boolean;
  // Phase 27: Intel Pro
  /** 30-day forecast available (starter+) */
  forecastBasic: boolean;
  /** 60/90-day forecast + anomaly detection (pro+) */
  forecastPro: boolean;
  /** Multi-region tax engine available */
  globalTax: boolean;
  /** Forensic audit chain verification + export */
  forensicAudit: boolean;
  /** Cash-flow optimizer + intelligent dunning */
  cashFlowOptimizer: boolean;
  /** Executive dashboard + flash reports */
  executiveHub: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceInr: number; // in paise (₹999 = 99900)
  yearlyPriceInr: number; // in paise (₹9,990 = 999000 — 2 months free)
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
    approvalPolicies: false,
    approvalPolicyManager: false,
    ticketSla: false,
    slaPolicyManager: false,
    workflowAutomation: false,
    workflowBuilderUi: false,
    workflowRunHistory: false,
    opsControlCenter: false,
    proxyAccess: false,
    apiAccess: false,
    prioritySupport: false,
    auditLogRetentionDays: 7,
    pdfStudioTools: false,
    pixelPassportPhotos: false,
    dunningSequences: 1,
    dunningStepsPerSequence: 3,
    smsReminders: false,
    customerPortal: false,
    portalCustomDomain: false,
    accountStatements: false,
    quotesPerMonth: 10,
    cashFlowForecast: false,
    customerHealthScores: false,
    paymentArrangements: false,
    gstEInvoicing: false,
    tdsTracking: false,
    gstrExport: false,
    multiCurrency: false,
    accountingCore: false,
    bankReconciliation: false,
    vendorBills: false,
    financialStatements: false,
    closeWorkflow: false,
    auditPackExports: false,
    bankAccounts: 0,
    statementImportsPerMonth: 0,
    vendorBillsPerMonth: 0,
    templatePublish: false,
    oauthApps: false,
    webhookV2: false,
    partnerProgram: false,
    aiInsights: false,
    documentIntelligence: false,
    anomalyDetection: false,
    aiRunsPerMonth: 0,
    activePortalSessions: 5,
    activeShareBundles: 10,
    pixelJobsSaved: 20,
    activeWorkflowAutomations: 0,
    multiEntity: false,
    maxEntitiesPerGroup: 0,
    inventoryManagement: false,
    maxWarehouses: 0,
    procurementAp: false,
    eInvoicingV2: false,
    enterpriseCrm: false,
    sopKnowledgeBase: false,
    forecastBasic: false,
    forecastPro: false,
    globalTax: false,
    forensicAudit: false,
    cashFlowOptimizer: false,
    executiveHub: false,
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
    approvalPolicies: false,
    approvalPolicyManager: false,
    ticketSla: false,
    slaPolicyManager: false,
    workflowAutomation: false,
    workflowBuilderUi: false,
    workflowRunHistory: false,
    opsControlCenter: false,
    proxyAccess: false,
    apiAccess: false,
    prioritySupport: false,
    auditLogRetentionDays: 30,
    pdfStudioTools: true,
    pixelPassportPhotos: true,
    dunningSequences: 3,
    dunningStepsPerSequence: 5,
    smsReminders: false,
    customerPortal: true,
    portalCustomDomain: false,
    accountStatements: false,
    quotesPerMonth: 50,
    cashFlowForecast: false,
    customerHealthScores: false,
    paymentArrangements: true,
    gstEInvoicing: false,
    tdsTracking: true,
    gstrExport: false,
    multiCurrency: true,
    accountingCore: true,
    bankReconciliation: false,
    vendorBills: true,
    financialStatements: true,
    closeWorkflow: false,
    auditPackExports: false,
    bankAccounts: 1,
    statementImportsPerMonth: 5,
    vendorBillsPerMonth: 100,
    templatePublish: false,
    oauthApps: true,
    webhookV2: true,
    partnerProgram: false,
    aiInsights: false,
    documentIntelligence: false,
    anomalyDetection: false,
    aiRunsPerMonth: 0,
    activePortalSessions: 25,
    activeShareBundles: 50,
    pixelJobsSaved: 200,
    activeWorkflowAutomations: 5,
    multiEntity: false,
    maxEntitiesPerGroup: 0,
    inventoryManagement: false,
    maxWarehouses: 0,
    procurementAp: false,
    eInvoicingV2: false,
    enterpriseCrm: false,
    sopKnowledgeBase: false,
    forecastBasic: true,
    forecastPro: false,
    globalTax: false,
    forensicAudit: false,
    cashFlowOptimizer: false,
    executiveHub: false,
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
    approvalPolicies: true,
    approvalPolicyManager: true,
    ticketSla: true,
    slaPolicyManager: true,
    workflowAutomation: false,
    workflowBuilderUi: false,
    workflowRunHistory: false,
    opsControlCenter: false,
    proxyAccess: true,
    apiAccess: true,
    prioritySupport: true,
    auditLogRetentionDays: 90,
    pdfStudioTools: true,
    pixelPassportPhotos: true,
    dunningSequences: 10,
    dunningStepsPerSequence: 7,
    smsReminders: true,
    customerPortal: true,
    portalCustomDomain: false,
    accountStatements: true,
    quotesPerMonth: 500,
    cashFlowForecast: true,
    customerHealthScores: true,
    paymentArrangements: true,
    gstEInvoicing: true,
    tdsTracking: true,
    gstrExport: true,
    multiCurrency: true,
    accountingCore: true,
    bankReconciliation: true,
    vendorBills: true,
    financialStatements: true,
    closeWorkflow: true,
    auditPackExports: false,
    bankAccounts: 5,
    statementImportsPerMonth: 50,
    vendorBillsPerMonth: 1000,
    templatePublish: true,
    oauthApps: true,
    webhookV2: true,
    partnerProgram: true,
    aiInsights: true,
    documentIntelligence: true,
    anomalyDetection: true,
    aiRunsPerMonth: 200,
    activePortalSessions: 200,
    activeShareBundles: 500,
    pixelJobsSaved: 2000,
    activeWorkflowAutomations: 25,
    multiEntity: false,
    maxEntitiesPerGroup: 0,
    inventoryManagement: true,
    maxWarehouses: 2,
    procurementAp: true,
    eInvoicingV2: true,
    enterpriseCrm: false,
    sopKnowledgeBase: false,
    forecastBasic: true,
    forecastPro: true,
    globalTax: true,
    forensicAudit: true,
    cashFlowOptimizer: true,
    executiveHub: true,
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
    approvalPolicies: true,
    approvalPolicyManager: true,
    ticketSla: true,
    slaPolicyManager: true,
    workflowAutomation: true,
    workflowBuilderUi: true,
    workflowRunHistory: true,
    opsControlCenter: true,
    proxyAccess: true,
    apiAccess: true,
    prioritySupport: true,
    auditLogRetentionDays: 365,
    pdfStudioTools: true,
    pixelPassportPhotos: true,
    dunningSequences: Infinity,
    dunningStepsPerSequence: 10,
    smsReminders: true,
    customerPortal: true,
    portalCustomDomain: true,
    accountStatements: true,
    quotesPerMonth: Infinity,
    cashFlowForecast: true,
    customerHealthScores: true,
    paymentArrangements: true,
    gstEInvoicing: true,
    tdsTracking: true,
    gstrExport: true,
    multiCurrency: true,
    accountingCore: true,
    bankReconciliation: true,
    vendorBills: true,
    financialStatements: true,
    closeWorkflow: true,
    auditPackExports: true,
    bankAccounts: Infinity,
    statementImportsPerMonth: Infinity,
    vendorBillsPerMonth: Infinity,
    templatePublish: true,
    oauthApps: true,
    webhookV2: true,
    partnerProgram: true,
    aiInsights: true,
    documentIntelligence: true,
    anomalyDetection: true,
    aiRunsPerMonth: Infinity,
    activePortalSessions: -1,
    activeShareBundles: -1,
    pixelJobsSaved: -1,
    activeWorkflowAutomations: -1,
    multiEntity: true,
    maxEntitiesPerGroup: -1,
    inventoryManagement: true,
    maxWarehouses: -1,
    procurementAp: true,
    eInvoicingV2: true,
    enterpriseCrm: true,
    sopKnowledgeBase: true,
    forecastBasic: true,
    forecastPro: true,
    globalTax: true,
    forensicAudit: true,
    cashFlowOptimizer: true,
    executiveHub: true,
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
