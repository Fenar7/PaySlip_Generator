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
  templateId: string;
  previewImage: string;
  isPremium: boolean;
  tags: string[];
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // General Business
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "Pure white layout with restrained typography. Lets your content breathe.",
    category: "general",
    docTypes: ["invoice", "voucher", "salary-slip"],
    templateId: "minimal",
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
    previewImage: "/templates/professional-navy.svg",
    isPremium: false,
    tags: ["structured", "professional", "corporate"],
  },
  {
    id: "bold-brand",
    name: "Bold Brand",
    description: "Expressive branded header with confident summary area. Great for agencies.",
    category: "general",
    docTypes: ["invoice"],
    templateId: "bold-brand",
    previewImage: "/templates/bold-brand.svg",
    isPremium: false,
    tags: ["branded", "colorful", "agency"],
  },
  // Medical
  {
    id: "medical-invoice",
    name: "Medical Invoice",
    description: "Clinical layout with professional trust signals for healthcare providers.",
    category: "medical",
    docTypes: ["invoice"],
    templateId: "minimal",
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
    templateId: "minimal",
    previewImage: "/templates/clinical-receipt.svg",
    isPremium: false,
    tags: ["pharmacy", "receipt", "patient"],
  },
  // Logistics
  {
    id: "delivery-note",
    name: "Delivery Note Invoice",
    description: "Combined delivery note and invoice for logistics and courier businesses.",
    category: "logistics",
    docTypes: ["invoice"],
    templateId: "professional",
    previewImage: "/templates/delivery-note.svg",
    isPremium: false,
    tags: ["delivery", "logistics", "courier"],
  },
  {
    id: "logistics-bill",
    name: "Logistics Bill",
    description: "Freight and transport billing with route and cargo details.",
    category: "logistics",
    docTypes: ["invoice"],
    templateId: "professional",
    previewImage: "/templates/logistics-bill.svg",
    isPremium: false,
    tags: ["freight", "transport", "cargo"],
  },
  // Hospitality
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
    description: "Clean restaurant receipt with table number and cover count support.",
    category: "hospitality",
    docTypes: ["voucher"],
    templateId: "minimal",
    previewImage: "/templates/restaurant-bill.svg",
    isPremium: false,
    tags: ["restaurant", "food", "dining"],
  },
  // HR
  {
    id: "corporate-salary",
    name: "Corporate Salary Slip",
    description: "Formal salary slip layout for mid to large enterprises.",
    category: "hr",
    docTypes: ["salary-slip"],
    templateId: "professional",
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
    templateId: "bold-brand",
    previewImage: "/templates/executive-slip.svg",
    isPremium: true,
    tags: ["executive", "premium", "ctc"],
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
