export type ProductModule = {
  slug: "voucher" | "salary-slip" | "invoice";
  name: string;
  eyebrow: string;
  description: string;
  highlights: string[];
};

export const productModules: ProductModule[] = [
  {
    slug: "voucher",
    name: "Voucher Generator",
    eyebrow: "Operations",
    description:
      "Create payment and receipt vouchers with clean layouts and approval-ready details.",
    highlights: [
      "Payment and receipt flows",
      "Structured narration and approvals",
      "A4-ready preview surface",
    ],
  },
  {
    slug: "salary-slip",
    name: "Salary Slip Generator",
    eyebrow: "People Ops",
    description:
      "Build polished payslips with a calm workspace for employee details, earnings, and deductions.",
    highlights: [
      "Repeatable earning rows",
      "Live total summaries",
      "Optional bank and signature blocks",
    ],
  },
  {
    slug: "invoice",
    name: "Invoice Generator",
    eyebrow: "Finance",
    description:
      "Prepare branded invoices with room for tax, line-item detail, and client-ready presentation.",
    highlights: [
      "Line-item and tax structure",
      "Client and business identity blocks",
      "Export-focused document canvas",
    ],
  },
];
