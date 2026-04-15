export interface NavItem {
  href: string;
  label: string;
  suite: string;
  badge?: string;
  children?: { href: string; label: string }[];
}

export const suiteNavItems: NavItem[] = [
  {
    href: "/app/home",
    label: "Home",
    suite: "home",
  },
  {
    href: "/app/docs/invoices/new",
    label: "Docs",
    suite: "docs",
    children: [
      { href: "/app/docs/invoices/new", label: "Invoice Studio" },
      { href: "/app/docs/vouchers/new", label: "Voucher Studio" },
      { href: "/app/docs/salary-slips/new", label: "Salary Slips" },
      { href: "/app/docs/invoices", label: "Invoice Vault" },
      { href: "/app/docs/vouchers", label: "Voucher Vault" },
      { href: "/app/docs/templates", label: "✨ Templates" },
      { href: "/app/docs/templates/marketplace", label: "Template Marketplace" },
      { href: "/app/docs/templates/publisher/payouts", label: "Publisher Payouts" },
      { href: "/app/docs/pdf-studio", label: "PDF Studio" },
    ],
  },
  {
    href: "/app/data/customers",
    label: "Master Data",
    suite: "data",
    children: [
      { href: "/app/data/customers", label: "Customers" },
      { href: "/app/data/vendors", label: "Vendors" },
      { href: "/app/data/employees", label: "Employees" },
      { href: "/app/data/salary-presets", label: "Salary Presets" },
    ],
  },
  {
    href: "/app/pay/receivables",
    label: "Pay",
    suite: "pay",
    children: [
      { href: "/app/pay/receivables", label: "Receivables" },
      { href: "/app/pay/proofs", label: "Payment Proofs" },
      { href: "/app/pay/send-log", label: "Send Log" },
      { href: "/app/pay/recurring", label: "Recurring Invoices" },
    ],
  },
  {
    href: "/app/books",
    label: "Books",
    suite: "books",
    children: [
      { href: "/app/books", label: "Overview" },
      { href: "/app/books/chart-of-accounts", label: "Chart of Accounts" },
      { href: "/app/books/journals", label: "Journals" },
      { href: "/app/books/ledger", label: "Ledger" },
      { href: "/app/books/trial-balance", label: "Trial Balance" },
      { href: "/app/books/banks", label: "Banks" },
      { href: "/app/books/reconciliation", label: "Reconciliation" },
      { href: "/app/books/vendor-bills", label: "Vendor Bills" },
      { href: "/app/books/payment-runs", label: "Payment Runs" },
      { href: "/app/books/close", label: "Close Center" },
      { href: "/app/books/reports/profit-loss", label: "Profit & Loss" },
      { href: "/app/books/reports/balance-sheet", label: "Balance Sheet" },
      { href: "/app/books/reports/cash-flow", label: "Cash Flow" },
      { href: "/app/books/reports/ar-aging", label: "AR Aging" },
      { href: "/app/books/reports/ap-aging", label: "AP Aging" },
      { href: "/app/books/settings", label: "Settings" },
    ],
  },
  {
    href: "/app/flow/tickets",
    label: "Flow",
    suite: "flow",
    children: [
      { href: "/app/flow/tickets", label: "Tickets" },
      { href: "/app/flow/approvals", label: "Approvals" },
      { href: "/app/flow/notifications", label: "Notifications" },
      { href: "/app/flow/activity", label: "Activity Feed" },
      { href: "/app/flow/jobs", label: "Job Log" },
    ],
  },
  {
    href: "/app/intel/dashboard",
    label: "Intel",
    suite: "intel",
    children: [
      { href: "/app/intel/dashboard", label: "Dashboard" },
      { href: "/app/intel/reports", label: "Reports" },
      { href: "/app/intel/insights", label: "Insights" },
      { href: "/app/intel/anomalies", label: "Anomaly Detection" },
      { href: "/app/intel/document-intelligence", label: "Document Intelligence" },
      { href: "/app/intel/customer-health", label: "Customer Health" },
      { href: "/app/intel/collections", label: "Collections Queue" },
      { href: "/app/intel/gst-reports", label: "GST Reports" },
      { href: "/app/intel/gst-filings", label: "GST Filings" },
      { href: "/app/intel/ai-usage", label: "AI Governance" },
    ],
  },
  {
    href: "/app/pixel",
    label: "Pixel",
    suite: "pixel",
    children: [
      { href: "/app/pixel/passport", label: "Passport Photo" },
      { href: "/app/pixel/resize", label: "Resize & Compress" },
      { href: "/app/pixel/adjust", label: "Adjustments" },
      { href: "/app/pixel/print-layout", label: "Print Layout" },
      { href: "/app/pixel/label", label: "Labels" },
    ],
  },
  {
    href: "/app/billing",
    label: "Billing",
    suite: "billing",
    children: [
      { href: "/app/billing", label: "Plan & Usage" },
      { href: "/app/billing/invoices", label: "Billing Invoices" },
    ],
  },
  {
    href: "/app/partner",
    label: "Partner",
    suite: "partner",
    children: [
      { href: "/app/partner", label: "Dashboard" },
      { href: "/app/partner/clients", label: "Managed Clients" },
      { href: "/app/partner/reports", label: "Reports" },
      { href: "/app/partner/apply", label: "Apply" },
    ],
  },
];
