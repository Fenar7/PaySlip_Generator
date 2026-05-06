import Link from "next/link";
import {
  FileText,
  Database,
  CreditCard,
  BookOpen,
  Workflow,
  BarChart3,
  Package,
  ShoppingCart,
  ShieldCheck,
  Users,
  BookMarked,
  ImageIcon,
  Receipt,
  Handshake,
  ArrowUpRight,
} from "lucide-react";

interface ModuleItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bg: string;
}

const modules: ModuleItem[] = [
  {
    label: "Invoice Studio",
    href: "/app/docs/invoices/new",
    icon: FileText,
    description: "Create & send invoices",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    label: "Voucher Studio",
    href: "/app/docs/vouchers/new",
    icon: Receipt,
    description: "Payment & receipt vouchers",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    label: "Salary Slips",
    href: "/app/docs/salary-slips/new",
    icon: CreditCard,
    description: "Generate payroll docs",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    label: "Doc Vault",
    href: "/app/docs/vault",
    icon: FileText,
    description: "All documents in one place",
    color: "#0D9488",
    bg: "#F0FDFA",
  },
  {
    label: "Master Data",
    href: "/app/data",
    icon: Database,
    description: "Customers, vendors, employees",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    label: "Books",
    href: "/app/books",
    icon: BookOpen,
    description: "Ledger, journals, reports",
    color: "#B45309",
    bg: "#FFFBEB",
  },
  {
    label: "Pay",
    href: "/app/pay",
    icon: CreditCard,
    description: "Receivables & reconciliation",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    label: "Intel",
    href: "/app/intel/dashboard",
    icon: BarChart3,
    description: "Analytics & insights",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    label: "Flow",
    href: "/app/flow",
    icon: Workflow,
    description: "Approvals & automations",
    color: "#BE185D",
    bg: "#FFF1F2",
  },
  {
    label: "Compliance",
    href: "/app/compliance",
    icon: ShieldCheck,
    description: "GST, e-invoice, TDS",
    color: "#4338CA",
    bg: "#E0E7FF",
  },
  {
    label: "CRM",
    href: "/app/crm",
    icon: Users,
    description: "Customer relationships",
    color: "#C2410C",
    bg: "#FFF7ED",
  },
  {
    label: "PDF Studio",
    href: "/app/docs/pdf-studio",
    icon: FileText,
    description: "Edit, merge, convert PDFs",
    color: "#52525B",
    bg: "#F4F4F5",
  },
];

export function ModuleGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {modules.map((mod) => (
        <Link
          key={mod.href}
          href={mod.href}
          className="group relative flex flex-col gap-2.5 rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#DC2626]"
          style={{ borderColor: "#E0E0E0" }}
        >
          <div className="flex items-start justify-between">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors group-hover:scale-105"
              style={{ background: mod.bg, color: mod.color }}
            >
              <mod.icon className="h-4 w-4" />
            </div>
            <ArrowUpRight
              className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100"
              style={{ color: mod.color }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1C1B1F" }}>
              {mod.label}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#79747E" }}>
              {mod.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
