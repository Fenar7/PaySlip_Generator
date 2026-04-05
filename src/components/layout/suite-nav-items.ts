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
  { href: "/app/intel", label: "Intel", suite: "intel", badge: "Soon" },
  { href: "/app/pixel", label: "Pixel", suite: "pixel", badge: "Soon" },
];
