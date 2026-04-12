import "server-only";

import { db } from "@/lib/db";
import type { GlAccount, GlAccountType, NormalBalance, Prisma } from "@/generated/prisma/client";
import { ensureFiscalPeriodsTx } from "./periods";
import { cleanText } from "./utils";

type TxClient = Prisma.TransactionClient;

export const SYSTEM_ACCOUNT_KEYS = {
  ASSETS_ROOT: "ASSETS_ROOT",
  LIABILITIES_ROOT: "LIABILITIES_ROOT",
  EQUITY_ROOT: "EQUITY_ROOT",
  INCOME_ROOT: "INCOME_ROOT",
  EXPENSES_ROOT: "EXPENSES_ROOT",
  ACCOUNTS_RECEIVABLE: "ACCOUNTS_RECEIVABLE",
  ACCOUNTS_PAYABLE: "ACCOUNTS_PAYABLE",
  CASH_ON_HAND: "CASH_ON_HAND",
  PRIMARY_BANK: "PRIMARY_BANK",
  PAYMENT_GATEWAY_CLEARING: "PAYMENT_GATEWAY_CLEARING",
  SUSPENSE_UNMATCHED: "SUSPENSE_UNMATCHED",
  SALES_REVENUE: "SALES_REVENUE",
  SERVICE_REVENUE: "SERVICE_REVENUE",
  DISCOUNTS_WRITEOFFS: "DISCOUNTS_WRITEOFFS",
  OPERATING_EXPENSES: "OPERATING_EXPENSES",
  GST_OUTPUT_TAX: "GST_OUTPUT_TAX",
  GST_INPUT_TAX: "GST_INPUT_TAX",
  TDS_RECEIVABLE: "TDS_RECEIVABLE",
  TDS_PAYABLE: "TDS_PAYABLE",
  PAYROLL_EXPENSE: "PAYROLL_EXPENSE",
  PAYROLL_PAYABLE: "PAYROLL_PAYABLE",
  BANK_CHARGES: "BANK_CHARGES",
  OPENING_BALANCE_EQUITY: "OPENING_BALANCE_EQUITY",
} as const;

export type SystemAccountKey = (typeof SYSTEM_ACCOUNT_KEYS)[keyof typeof SYSTEM_ACCOUNT_KEYS];

interface AccountSeed {
  code: string;
  name: string;
  accountType: GlAccountType;
  normalBalance: NormalBalance;
  parentCode?: string;
  systemKey?: SystemAccountKey;
  description?: string;
  isSystem?: boolean;
  isProtected?: boolean;
  allowManualEntries?: boolean;
  sortOrder?: number;
}

export interface BooksSetupResult {
  templateKey: string;
  accountsCreated: number;
  periodsCreated: number;
}

const DEFAULT_TEMPLATE: AccountSeed[] = [
  {
    code: "1000",
    name: "Assets",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    systemKey: SYSTEM_ACCOUNT_KEYS.ASSETS_ROOT,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 10,
  },
  {
    code: "1100",
    name: "Accounts Receivable",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 20,
  },
  {
    code: "1110",
    name: "Cash on Hand",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.CASH_ON_HAND,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 30,
  },
  {
    code: "1120",
    name: "Primary Bank",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 40,
  },
  {
    code: "1130",
    name: "Payment Gateway Clearing",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.PAYMENT_GATEWAY_CLEARING,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 50,
  },
  {
    code: "1190",
    name: "Suspense / Unmatched Reconciliation",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.SUSPENSE_UNMATCHED,
    isSystem: true,
    isProtected: true,
    sortOrder: 60,
  },
  {
    code: "1200",
    name: "GST Input Tax",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.GST_INPUT_TAX,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 70,
  },
  {
    code: "1210",
    name: "TDS Receivable",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
    systemKey: SYSTEM_ACCOUNT_KEYS.TDS_RECEIVABLE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 80,
  },
  {
    code: "2000",
    name: "Liabilities",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    systemKey: SYSTEM_ACCOUNT_KEYS.LIABILITIES_ROOT,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 90,
  },
  {
    code: "2100",
    name: "Accounts Payable",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2000",
    systemKey: SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 100,
  },
  {
    code: "2200",
    name: "GST Output Tax",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2000",
    systemKey: SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 110,
  },
  {
    code: "2210",
    name: "TDS Payable",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2000",
    systemKey: SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 120,
  },
  {
    code: "2300",
    name: "Payroll Payable",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2000",
    systemKey: SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 130,
  },
  {
    code: "3000",
    name: "Equity",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    systemKey: SYSTEM_ACCOUNT_KEYS.EQUITY_ROOT,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 140,
  },
  {
    code: "3100",
    name: "Opening Balance Equity",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    parentCode: "3000",
    systemKey: SYSTEM_ACCOUNT_KEYS.OPENING_BALANCE_EQUITY,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 150,
  },
  {
    code: "4000",
    name: "Income",
    accountType: "INCOME",
    normalBalance: "CREDIT",
    systemKey: SYSTEM_ACCOUNT_KEYS.INCOME_ROOT,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 160,
  },
  {
    code: "4100",
    name: "Sales Revenue",
    accountType: "INCOME",
    normalBalance: "CREDIT",
    parentCode: "4000",
    systemKey: SYSTEM_ACCOUNT_KEYS.SALES_REVENUE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 170,
  },
  {
    code: "4200",
    name: "Service Revenue",
    accountType: "INCOME",
    normalBalance: "CREDIT",
    parentCode: "4000",
    systemKey: SYSTEM_ACCOUNT_KEYS.SERVICE_REVENUE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 180,
  },
  {
    code: "4300",
    name: "Discounts / Write-offs",
    accountType: "CONTRA",
    normalBalance: "DEBIT",
    parentCode: "4000",
    systemKey: SYSTEM_ACCOUNT_KEYS.DISCOUNTS_WRITEOFFS,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 190,
  },
  {
    code: "5000",
    name: "Expenses",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    systemKey: SYSTEM_ACCOUNT_KEYS.EXPENSES_ROOT,
    isSystem: true,
    isProtected: true,
    allowManualEntries: false,
    sortOrder: 200,
  },
  {
    code: "5100",
    name: "Payroll Expense",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentCode: "5000",
    systemKey: SYSTEM_ACCOUNT_KEYS.PAYROLL_EXPENSE,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 210,
  },
  {
    code: "5200",
    name: "Bank Charges / Finance Fees",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentCode: "5000",
    systemKey: SYSTEM_ACCOUNT_KEYS.BANK_CHARGES,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 220,
  },
  {
    code: "5300",
    name: "Operating Expenses",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentCode: "5000",
    systemKey: SYSTEM_ACCOUNT_KEYS.OPERATING_EXPENSES,
    isSystem: true,
    isProtected: true,
    allowManualEntries: true,
    sortOrder: 230,
  },
];

function getCoaTemplate(country?: string | null, baseCurrency?: string | null): {
  templateKey: string;
  accounts: AccountSeed[];
} {
  const normalizedCountry = country?.toUpperCase() ?? null;
  const normalizedCurrency = baseCurrency?.trim().toUpperCase() ?? null;

  if (normalizedCountry === "IN") {
    return {
      templateKey:
        !normalizedCurrency || normalizedCurrency === "INR"
          ? "IN_STANDARD"
          : `IN_STANDARD_${normalizedCurrency}`,
      accounts: DEFAULT_TEMPLATE,
    };
  }

  return {
    templateKey:
      !normalizedCurrency || normalizedCurrency === "USD"
        ? "GLOBAL_STANDARD"
        : `GLOBAL_STANDARD_${normalizedCurrency}`,
    accounts: DEFAULT_TEMPLATE,
  };
}

export function defaultNormalBalanceForType(accountType: GlAccountType): NormalBalance {
  switch (accountType) {
    case "ASSET":
    case "EXPENSE":
    case "CONTRA":
      return "DEBIT";
    case "LIABILITY":
    case "EQUITY":
    case "INCOME":
      return "CREDIT";
  }
}

function sanitizeAccountCode(rawCode: string): string {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) {
    throw new Error("Account code is required.");
  }
  return code;
}

async function seedAccountsTx(
  tx: TxClient,
  orgId: string,
  country?: string | null,
  baseCurrency?: string | null,
): Promise<{
  templateKey: string;
  accountsCreated: number;
  systemAccountIds: Partial<Record<SystemAccountKey, string>>;
}> {
  const { templateKey, accounts } = getCoaTemplate(country, baseCurrency);
  const existingAccounts = await tx.glAccount.findMany({
    where: { orgId },
    select: {
      id: true,
      code: true,
      systemKey: true,
    },
  });

  const accountIdsByCode = new Map(existingAccounts.map((account) => [account.code, account.id]));
  const systemAccountIds = existingAccounts.reduce<Partial<Record<SystemAccountKey, string>>>(
    (acc, account) => {
      if (account.systemKey) {
        acc[account.systemKey as SystemAccountKey] = account.id;
      }
      return acc;
    },
    {},
  );

  let accountsCreated = 0;

  for (const account of accounts) {
    const existingId =
      (account.systemKey ? systemAccountIds[account.systemKey] : null) ??
      accountIdsByCode.get(account.code);

    if (existingId) {
      accountIdsByCode.set(account.code, existingId);
      if (account.systemKey) {
        systemAccountIds[account.systemKey] = existingId;
      }
      continue;
    }

    const created = await tx.glAccount.create({
      data: {
        orgId,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        parentId: account.parentCode ? accountIdsByCode.get(account.parentCode) : undefined,
        description: account.description,
        systemKey: account.systemKey,
        isSystem: account.isSystem ?? true,
        isProtected: account.isProtected ?? true,
        allowManualEntries: account.allowManualEntries ?? false,
        sortOrder: account.sortOrder ?? 0,
      },
      select: { id: true },
    });

    accountIdsByCode.set(account.code, created.id);
    if (account.systemKey) {
      systemAccountIds[account.systemKey] = created.id;
    }
    accountsCreated += 1;
  }

  return {
    templateKey,
    accountsCreated,
    systemAccountIds,
  };
}

export async function ensureBooksSetupTx(
  tx: TxClient,
  orgId: string,
): Promise<BooksSetupResult> {
  const defaults = await tx.orgDefaults.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId },
    update: {},
    select: {
      country: true,
      baseCurrency: true,
      fiscalYearStart: true,
      coaTemplate: true,
      coaSeededAt: true,
      defaultReceivableAccountId: true,
      defaultPayableAccountId: true,
      defaultBankAccountId: true,
      defaultRevenueAccountId: true,
      defaultExpenseAccountId: true,
      defaultPayrollExpenseAccountId: true,
      defaultPayrollPayableAccountId: true,
      defaultGstOutputAccountId: true,
      defaultTdsPayableAccountId: true,
      defaultGatewayClearingAccountId: true,
      defaultSuspenseAccountId: true,
    },
  });

  const { templateKey, accountsCreated, systemAccountIds } = await seedAccountsTx(
    tx,
    orgId,
    defaults.country,
    defaults.baseCurrency,
  );

  const periodsCreated = await ensureFiscalPeriodsTx(tx, {
    orgId,
    fiscalYearStartMonth: defaults.fiscalYearStart,
    referenceDate: new Date(),
  });

  await tx.orgDefaults.update({
    where: { organizationId: orgId },
    data: {
      booksEnabled: true,
      coaTemplate: defaults.coaTemplate ?? templateKey,
      coaSeededAt: defaults.coaSeededAt ?? new Date(),
      defaultReceivableAccountId:
        defaults.defaultReceivableAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE],
      defaultPayableAccountId:
        defaults.defaultPayableAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE],
      defaultBankAccountId:
        defaults.defaultBankAccountId ?? systemAccountIds[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK],
      defaultRevenueAccountId:
        defaults.defaultRevenueAccountId ?? systemAccountIds[SYSTEM_ACCOUNT_KEYS.SERVICE_REVENUE],
      defaultExpenseAccountId:
        defaults.defaultExpenseAccountId ?? systemAccountIds[SYSTEM_ACCOUNT_KEYS.OPERATING_EXPENSES],
      defaultPayrollExpenseAccountId:
        defaults.defaultPayrollExpenseAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.PAYROLL_EXPENSE],
      defaultPayrollPayableAccountId:
        defaults.defaultPayrollPayableAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE],
      defaultGstOutputAccountId:
        defaults.defaultGstOutputAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX],
      defaultTdsPayableAccountId:
        defaults.defaultTdsPayableAccountId ?? systemAccountIds[SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE],
      defaultGatewayClearingAccountId:
        defaults.defaultGatewayClearingAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.PAYMENT_GATEWAY_CLEARING],
      defaultSuspenseAccountId:
        defaults.defaultSuspenseAccountId ??
        systemAccountIds[SYSTEM_ACCOUNT_KEYS.SUSPENSE_UNMATCHED],
    },
  });

  return {
    templateKey,
    accountsCreated,
    periodsCreated,
  };
}

export async function ensureBooksSetup(orgId: string): Promise<BooksSetupResult> {
  return db.$transaction((tx) => ensureBooksSetupTx(tx, orgId));
}

export async function listGlAccounts(orgId: string) {
  await ensureBooksSetup(orgId);

  return db.glAccount.findMany({
    where: { orgId },
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
}

export async function createGlAccount(input: {
  orgId: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  parentId?: string | null;
  normalBalance?: NormalBalance;
  description?: string | null;
}): Promise<GlAccount> {
  const code = sanitizeAccountCode(input.code);
  const name = input.name.trim();

  if (!name) {
    throw new Error("Account name is required.");
  }

  await ensureBooksSetup(input.orgId);

  return db.glAccount.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      accountType: input.accountType,
      normalBalance: input.normalBalance ?? defaultNormalBalanceForType(input.accountType),
      parentId: input.parentId ?? undefined,
      description: cleanText(input.description),
      isSystem: false,
      isProtected: false,
      allowManualEntries: true,
    },
  });
}

export async function archiveGlAccount(orgId: string, accountId: string): Promise<GlAccount> {
  const account = await db.glAccount.findFirst({
    where: { id: accountId, orgId },
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  if (account.isSystem || account.isProtected) {
    throw new Error("System accounts cannot be archived.");
  }

  const usageCount = await db.journalLine.count({
    where: { orgId, accountId },
  });

  if (usageCount > 0) {
    throw new Error("Accounts with journal usage cannot be archived.");
  }

  const defaults = await db.orgDefaults.findUnique({
    where: { organizationId: orgId },
    select: {
      defaultReceivableAccountId: true,
      defaultPayableAccountId: true,
      defaultBankAccountId: true,
      defaultRevenueAccountId: true,
      defaultExpenseAccountId: true,
      defaultPayrollExpenseAccountId: true,
      defaultPayrollPayableAccountId: true,
      defaultGstOutputAccountId: true,
      defaultTdsPayableAccountId: true,
      defaultGatewayClearingAccountId: true,
      defaultSuspenseAccountId: true,
    },
  });

  const isDefaultMapped = Object.values(defaults ?? {}).includes(accountId);
  if (isDefaultMapped) {
    throw new Error("Default mapped accounts cannot be archived.");
  }

  return db.glAccount.update({
    where: { id: account.id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
  });
}

export async function getRequiredSystemAccountsTx(
  tx: TxClient,
  orgId: string,
  keys: SystemAccountKey[],
) {
  await ensureBooksSetupTx(tx, orgId);

  const accounts = await tx.glAccount.findMany({
    where: {
      orgId,
      systemKey: {
        in: keys,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      systemKey: true,
      normalBalance: true,
      accountType: true,
    },
  });

  const byKey = accounts.reduce<
    Partial<
      Record<
        SystemAccountKey,
        {
          id: string;
          code: string;
          name: string;
          normalBalance: NormalBalance;
          accountType: GlAccountType;
        }
      >
    >
  >((acc, account) => {
    if (account.systemKey) {
      acc[account.systemKey as SystemAccountKey] = {
        id: account.id,
        code: account.code,
        name: account.name,
        normalBalance: account.normalBalance,
        accountType: account.accountType,
      };
    }
    return acc;
  }, {});

  for (const key of keys) {
    if (!byKey[key]) {
      throw new Error(`Missing required system account: ${key}`);
    }
  }

  return byKey as Record<
    SystemAccountKey,
    {
      id: string;
      code: string;
      name: string;
      normalBalance: NormalBalance;
      accountType: GlAccountType;
    }
  >;
}
