export type ProductModule = {
  slug: "voucher" | "salary-slip" | "invoice" | "pdf-studio";
  href: string;
  name: string;
  eyebrow: string;
  description: string;
  highlights: string[];
};

export const productModules: ProductModule[] = [
  {
    slug: "voucher",
    href: "/app/docs/vouchers/new",
    name: "Voucher Generator",
    eyebrow: "Operations",
    description:
      "Create payment and receipt vouchers with the right structure, clear narration, and export-ready formatting.",
    highlights: [
      "Payment and receipt flows",
      "Approval-friendly layouts",
      "A4-ready preview and export",
    ],
  },
  {
    slug: "salary-slip",
    href: "/app/docs/salary-slips/new",
    name: "Salary Slip Generator",
    eyebrow: "People Ops",
    description:
      "Prepare salary slips with structured employee data, earnings, deductions, and disbursement details in one flow.",
    highlights: [
      "Repeatable earning rows",
      "Live total summaries",
      "Optional bank and signature blocks",
    ],
  },
  {
    slug: "invoice",
    href: "/app/docs/invoices/new",
    name: "Invoice Generator",
    eyebrow: "Finance",
    description:
      "Prepare branded invoices with clear line items, tax handling, and a final layout that is ready to send.",
    highlights: [
      "Line-item and tax structure",
      "Client and business identity blocks",
      "Export-focused document canvas",
    ],
  },
  {
    slug: "pdf-studio",
    href: "/app/docs/pdf-studio",
    name: "PDF Studio",
    eyebrow: "Utilities",
    description:
      "Convert images to a single PDF in your browser. Upload up to 30 images, arrange them, set page options, and download the result instantly.",
    highlights: [
      "Drag-and-drop image organizer",
      "Page size, orientation, and fit controls",
      "Client-side PDF generation",
    ],
  },
];
