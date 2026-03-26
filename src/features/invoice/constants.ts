import type {
  InvoiceFormValues,
  InvoiceTemplateId,
} from "@/features/invoice/types";

export const invoiceTemplateOptions: Array<{
  id: InvoiceTemplateId;
  name: string;
  description: string;
}> = [
  {
    id: "minimal",
    name: "Minimal",
    description: "A clean invoice layout with restrained typography and crisp totals.",
  },
  {
    id: "professional",
    name: "Professional",
    description: "Structured business blocks and strong financial hierarchy for client-ready use.",
  },
  {
    id: "bold-brand",
    name: "Bold Brand",
    description: "A more expressive branded header with a confident summary area.",
  },
];

export const invoiceDefaultValues: InvoiceFormValues = {
  templateId: "professional",
  branding: {
    companyName: "Northfield Trading Co.",
    address: "18 Market Road, Kozhikode",
    email: "accounts@northfield.example",
    phone: "+91 98765 43210",
    accentColor: "#c69854",
  },
  businessTaxId: "GSTIN 32ABCDE1234F1Z6",
  clientName: "Axis PeopleX Pvt. Ltd.",
  clientAddress: "4th Floor, Grand Square, Kochi",
  clientEmail: "finance@axispeoplex.example",
  clientPhone: "+91 98470 12000",
  invoiceNumber: "INV-2026-031",
  invoiceDate: "2026-03-26",
  dueDate: "2026-04-02",
  amountPaid: "15000",
  notes:
    "Thank you for the continued engagement. Please reference the invoice number with your remittance.",
  terms:
    "Payment due within 7 days. Late payments may be subject to a finance charge after prior notice.",
  bankName: "Federal Bank",
  bankAccountNumber: "122001004281",
  bankIfsc: "FDRL0001220",
  authorizedBy: "Anita Thomas",
  lineItems: [
    {
      description: "HR outsourcing retainer for March 2026",
      quantity: "1",
      unitPrice: "32000",
      taxRate: "18",
      discountAmount: "2000",
    },
    {
      description: "Recruitment coordination support",
      quantity: "2",
      unitPrice: "7500",
      taxRate: "18",
      discountAmount: "0",
    },
  ],
  visibility: {
    showAddress: true,
    showEmail: true,
    showPhone: true,
    showBusinessTaxId: true,
    showClientAddress: true,
    showClientEmail: true,
    showClientPhone: true,
    showDueDate: true,
    showNotes: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true,
  },
};
