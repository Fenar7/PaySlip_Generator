"use server";
import { db } from "@/lib/db";

export async function saveOnboardingBranding({
  organizationId,
  accentColor,
  fontFamily,
}: {
  organizationId: string;
  accentColor: string;
  fontFamily: string;
}) {
  await db.brandingProfile.upsert({
    where: { organizationId },
    create: { organizationId, accentColor, fontFamily },
    update: { accentColor, fontFamily },
  });
}

export async function saveOnboardingFinancials({
  organizationId,
  bankName,
  bankAccount,
  bankIFSC,
  taxId,
  gstin,
  businessAddress,
}: {
  organizationId: string;
  bankName: string;
  bankAccount: string;
  bankIFSC: string;
  taxId: string;
  gstin: string;
  businessAddress: string;
}) {
  await db.orgDefaults.upsert({
    where: { organizationId },
    create: { organizationId, bankName, bankAccount, bankIFSC, taxId, gstin, businessAddress },
    update: { bankName, bankAccount, bankIFSC, taxId, gstin, businessAddress },
  });
}

export async function saveOnboardingTemplates({
  organizationId,
  invoiceTemplate,
  slipTemplate,
  voucherTemplate,
}: {
  organizationId: string;
  invoiceTemplate: string;
  slipTemplate: string;
  voucherTemplate: string;
}) {
  await db.orgDefaults.upsert({
    where: { organizationId },
    create: {
      organizationId,
      defaultInvoiceTemplate: invoiceTemplate,
      defaultSlipTemplate: slipTemplate,
      defaultVoucherTemplate: voucherTemplate,
    },
    update: {
      defaultInvoiceTemplate: invoiceTemplate,
      defaultSlipTemplate: slipTemplate,
      defaultVoucherTemplate: voucherTemplate,
    },
  });
}
