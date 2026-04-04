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
      { href: "/app/docs/pdf-studio", label: "PDF Studio" },
    ],
  },
  { href: "/app/pay",   label: "Pay",   suite: "pay",   badge: "Soon" },
  { href: "/app/flow",  label: "Flow",  suite: "flow",  badge: "Soon" },
  { href: "/app/intel", label: "Intel", suite: "intel", badge: "Soon" },
  { href: "/app/pixel", label: "Pixel", suite: "pixel", badge: "Soon" },
];
