export type DocType = "invoice" | "voucher" | "salary-slip";
export type TemplateCategory =
  | "general"
  | "medical"
  | "logistics"
  | "hospitality"
  | "hr";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  docTypes: DocType[];
  /** Base templateId (used when no per-docType override is set). For invoices this is always the canonical value. */
  templateId: string;
  /** Per-docType overrides when a template supports multiple doc types with different workspace IDs. */
  templateIdByDocType?: Partial<Record<DocType, string>>;
  previewImage: string;
  isPremium: boolean;
  tags: string[];
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // ── General Business ──────────────────────────────────────
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "Pure white layout with restrained typography. Lets your content breathe.",
    category: "general",
    docTypes: ["invoice", "voucher", "salary-slip"],
    templateId: "minimal",
    templateIdByDocType: { voucher: "minimal-office", "salary-slip": "corporate-clean" },
    previewImage: "/templates/minimal-clean.svg",
    isPremium: false,
    tags: ["clean", "white", "simple"],
  },
  {
    id: "professional-navy",
    name: "Professional Navy",
    description: "Structured business blocks with strong financial hierarchy.",
    category: "general",
    docTypes: ["invoice", "voucher"],
    templateId: "professional",
    templateIdByDocType: { voucher: "traditional-ledger" },
    previewImage: "/templates/professional-navy.svg",
    isPremium: false,
    tags: ["structured", "professional", "corporate"],
  },
  {
    id: "bold-brand",
    name: "Bold Brand",
    description: "Expressive branded header with confident summary area. Great for agencies.",
    category: "general",
    docTypes: ["invoice", "voucher"],
    templateId: "bold-brand",
    templateIdByDocType: { voucher: "modern-card" },
    previewImage: "/templates/bold-brand.svg",
    isPremium: false,
    tags: ["branded", "colorful", "agency"],
  },
  {
    id: "classic-bordered-entry",
    name: "Classic Bordered",
    description: "Traditional accounting ledger with sharp borders and structured tables.",
    category: "general",
    docTypes: ["invoice", "voucher", "salary-slip"],
    templateId: "classic-bordered",
    templateIdByDocType: { voucher: "formal-bordered", "salary-slip": "classic-formal" },
    previewImage: "/templates/classic-bordered.svg",
    isPremium: false,
    tags: ["traditional", "bordered", "accounting"],
  },
  {
    id: "modern-edge-entry",
    name: "Modern Edge",
    description: "Asymmetric editorial design with bold typography and accent sidebar.",
    category: "general",
    docTypes: ["invoice", "voucher", "salary-slip"],
    templateId: "modern-edge",
    templateIdByDocType: { voucher: "compact-receipt", "salary-slip": "detailed-breakdown" },
    previewImage: "/templates/modern-edge.svg",
    isPremium: false,
    tags: ["modern", "editorial", "asymmetric"],
  },

  // ── Medical / Healthcare ──────────────────────────────────
  {
    id: "medical-invoice",
    name: "Medical Invoice",
    description: "Clinical layout with professional trust signals for healthcare providers.",
    category: "medical",
    docTypes: ["invoice", "voucher"],
    templateId: "classic-bordered",
    templateIdByDocType: { voucher: "formal-bordered" },
    previewImage: "/templates/medical-invoice.svg",
    isPremium: false,
    tags: ["healthcare", "clinical", "medical"],
  },
  {
    id: "clinical-receipt",
    name: "Clinical Receipt",
    description: "Clean receipt format for patient billing and pharmacy use.",
    category: "medical",
    docTypes: ["voucher"],
    templateId: "compact-receipt",
    previewImage: "/templates/clinical-receipt.svg",
    isPremium: false,
    tags: ["pharmacy", "receipt", "patient"],
  },
  {
    id: "medical-payslip",
    name: "Hospital Payslip",
    description: "Detailed payslip for hospital staff with shift and allowance breakdowns.",
    category: "medical",
    docTypes: ["salary-slip"],
    templateId: "detailed-breakdown",
    previewImage: "/templates/medical-payslip.svg",
    isPremium: false,
    tags: ["hospital", "staff", "payroll"],
  },

  // ── Delivery / Logistics ──────────────────────────────────
  {
    id: "delivery-note",
    name: "Delivery Note Invoice",
    description: "Combined delivery note and invoice for logistics and courier businesses.",
    category: "logistics",
    docTypes: ["invoice"],
    templateId: "modern-edge",
    previewImage: "/templates/delivery-note.svg",
    isPremium: false,
    tags: ["delivery", "logistics", "courier"],
  },
  {
    id: "logistics-bill",
    name: "Logistics Bill",
    description: "Freight and transport billing with route and cargo details.",
    category: "logistics",
    docTypes: ["invoice", "voucher"],
    templateId: "professional",
    templateIdByDocType: { voucher: "formal-bordered" },
    previewImage: "/templates/logistics-bill.svg",
    isPremium: false,
    tags: ["freight", "transport", "cargo"],
  },
  {
    id: "logistics-payslip",
    name: "Driver Payslip",
    description: "Compact payslip for fleet drivers with trip-based earnings.",
    category: "logistics",
    docTypes: ["salary-slip"],
    templateId: "compact-payslip",
    previewImage: "/templates/logistics-payslip.svg",
    isPremium: false,
    tags: ["driver", "fleet", "transport"],
  },

  // ── Hospitality ───────────────────────────────────────────
  {
    id: "hotel-invoice",
    name: "Hotel Invoice",
    description: "Elegant format for hotel billing with room and service itemization.",
    category: "hospitality",
    docTypes: ["invoice"],
    templateId: "bold-brand",
    previewImage: "/templates/hotel-invoice.svg",
    isPremium: false,
    tags: ["hotel", "accommodation", "hospitality"],
  },
  {
    id: "restaurant-bill",
    name: "Restaurant Bill",
    description: "Compact restaurant receipt with table number and cover count support.",
    category: "hospitality",
    docTypes: ["voucher"],
    templateId: "compact-receipt",
    previewImage: "/templates/restaurant-bill.svg",
    isPremium: false,
    tags: ["restaurant", "food", "dining"],
  },
  {
    id: "hospitality-payslip",
    name: "Hospitality Payslip",
    description: "Staff payslip with tips, overtime, and service charge breakdowns.",
    category: "hospitality",
    docTypes: ["salary-slip"],
    templateId: "modern-premium",
    previewImage: "/templates/hospitality-payslip.svg",
    isPremium: false,
    tags: ["hotel", "staff", "tips"],
  },

  // ── Corporate HR ──────────────────────────────────────────
  {
    id: "corporate-salary",
    name: "Corporate Salary Slip",
    description: "Formal salary slip layout for mid to large enterprises.",
    category: "hr",
    docTypes: ["salary-slip"],
    templateId: "corporate-clean",
    previewImage: "/templates/corporate-salary.svg",
    isPremium: false,
    tags: ["corporate", "salary", "hr"],
  },
  {
    id: "executive-slip",
    name: "Executive Slip",
    description: "Premium salary slip with CTC breakdown and benefits summary.",
    category: "hr",
    docTypes: ["salary-slip"],
    templateId: "detailed-breakdown",
    previewImage: "/templates/executive-slip.svg",
    isPremium: true,
    tags: ["executive", "premium", "ctc"],
  },
  {
    id: "startup-payslip",
    name: "Startup Payslip",
    description: "Modern compact payslip perfect for fast-moving startups.",
    category: "hr",
    docTypes: ["salary-slip"],
    templateId: "compact-payslip",
    previewImage: "/templates/startup-payslip.svg",
    isPremium: false,
    tags: ["startup", "compact", "modern"],
  },
  {
    id: "classic-hr-slip",
    name: "Classic HR Slip",
    description: "Traditional bordered payslip used by established enterprises.",
    category: "hr",
    docTypes: ["salary-slip"],
    templateId: "classic-formal",
    previewImage: "/templates/classic-hr-slip.svg",
    isPremium: false,
    tags: ["traditional", "formal", "enterprise"],
  },
];

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: "General Business",
  medical: "Medical / Healthcare",
  logistics: "Delivery / Logistics",
  hospitality: "Hospitality",
  hr: "Corporate HR",
};

export const DOCTYPE_LABELS: Record<DocType, string> = {
  invoice: "Invoice",
  voucher: "Voucher",
  "salary-slip": "Salary Slip",
};

export function getTemplatesForDocType(docType: DocType): TemplateDefinition[] {
  return TEMPLATE_REGISTRY.filter((t) => t.docTypes.includes(docType));
}

export function getTemplatesByCategory(category: TemplateCategory): TemplateDefinition[] {
  return TEMPLATE_REGISTRY.filter((t) => t.category === category);
}

/** Returns the correct templateId for the given docType, respecting per-docType overrides. */
export function getEffectiveTemplateId(template: TemplateDefinition, docType: DocType): string {
  return template.templateIdByDocType?.[docType] ?? template.templateId;
}
