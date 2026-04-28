import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getRequiredSystemAccountsTx, SYSTEM_ACCOUNT_KEYS } from "./accounts";
import { createAndPostJournalTx } from "./journals";
import { cleanText, parseAccountingDate, roundMoney, toAccountingNumber } from "./utils";

type TxClient = Prisma.TransactionClient;

function buildPaymentDebitAccountKey(source: string | null | undefined) {
  if (source === "razorpay_payment_link" || source === "virtual_account") {
    return SYSTEM_ACCOUNT_KEYS.PAYMENT_GATEWAY_CLEARING;
  }

  return SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK;
}

export async function postInvoiceIssueTx(
  tx: TxClient,
  input: {
    orgId: string;
    invoiceId: string;
    actorId?: string;
  },
) {
  const invoice = await tx.invoice.findFirst({
    where: {
      id: input.invoiceId,
      organizationId: input.orgId,
    },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      totalAmount: true,
      reverseCharge: true,
      gstTotalCgst: true,
      gstTotalSgst: true,
      gstTotalIgst: true,
      gstTotalCess: true,
      postedJournalEntryId: true,
      accountingStatus: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.postedJournalEntryId || invoice.accountingStatus === "POSTED") {
    return invoice.postedJournalEntryId
      ? tx.journalEntry.findUnique({ where: { id: invoice.postedJournalEntryId } })
      : null;
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
    SYSTEM_ACCOUNT_KEYS.SERVICE_REVENUE,
    SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX,
  ]);

  const gstTotal = roundMoney(
    toAccountingNumber(invoice.gstTotalCgst) +
      toAccountingNumber(invoice.gstTotalSgst) +
      toAccountingNumber(invoice.gstTotalIgst) +
      toAccountingNumber(invoice.gstTotalCess),
  );
  const revenueAmount = invoice.reverseCharge
    ? roundMoney(invoice.totalAmount)
    : roundMoney(toAccountingNumber(invoice.totalAmount) - gstTotal);

  if (revenueAmount < 0) {
    throw new Error("Invoice revenue amount cannot be negative.");
  }

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "INVOICE",
    sourceId: invoice.id,
    sourceRef: invoice.invoiceNumber,
    entryDate: parseAccountingDate(invoice.invoiceDate),
    actorId: input.actorId,
    memo: `Invoice ${invoice.invoiceNumber}`,
    lines: [
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE].id,
        debit: roundMoney(invoice.totalAmount),
        description: `Invoice ${invoice.invoiceNumber}`,
        entityType: "invoice",
        entityId: invoice.id,
      },
      ...(revenueAmount > 0
        ? [
            {
              accountId: accounts[SYSTEM_ACCOUNT_KEYS.SERVICE_REVENUE].id,
              credit: revenueAmount,
              description: `Revenue for invoice ${invoice.invoiceNumber}`,
              entityType: "invoice",
              entityId: invoice.id,
            },
          ]
        : []),
      ...(!invoice.reverseCharge && gstTotal > 0
        ? [
            {
              accountId: accounts[SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX].id,
              credit: gstTotal,
              description: `GST output for invoice ${invoice.invoiceNumber}`,
              entityType: "invoice",
              entityId: invoice.id,
            },
          ]
        : []),
    ],
  });

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      postedJournalEntryId: journal.id,
      accountingStatus: "POSTED",
      revenueRecognitionStatus: "RECOGNIZED",
      accountingPostedAt: new Date(),
    },
  });

  return journal;
}

export async function postInvoicePaymentTx(
  tx: TxClient,
  input: {
    orgId: string;
    invoicePaymentId: string;
    actorId?: string;
  },
) {
  const payment = await tx.invoicePayment.findFirst({
    where: {
      id: input.invoicePaymentId,
      orgId: input.orgId,
    },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("Invoice payment not found.");
  }

  if (payment.status !== "SETTLED") {
    return null;
  }

  if (payment.journalEntryId || payment.accountingStatus === "POSTED") {
    return payment.journalEntryId
      ? tx.journalEntry.findUnique({ where: { id: payment.journalEntryId } })
      : null;
  }

  const debitAccountKey = payment.clearingAccountId
    ? null
    : buildPaymentDebitAccountKey(payment.source);

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
    ...(debitAccountKey ? [debitAccountKey] : []),
  ]);

  const debitAccountId =
    payment.clearingAccountId ??
    (debitAccountKey ? accounts[debitAccountKey].id : undefined);

  if (!debitAccountId) {
    throw new Error("Unable to resolve the debit account for this payment.");
  }

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "INVOICE_PAYMENT",
    sourceId: payment.id,
    sourceRef: payment.invoice.invoiceNumber,
    entryDate: payment.paidAt,
    actorId: input.actorId,
    memo: cleanText(payment.note) ?? `Payment for invoice ${payment.invoice.invoiceNumber}`,
    lines: [
      {
        accountId: debitAccountId,
        debit: roundMoney(payment.amount),
        description: `Receipt for invoice ${payment.invoice.invoiceNumber}`,
        entityType: "invoice_payment",
        entityId: payment.id,
      },
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE].id,
        credit: roundMoney(payment.amount),
        description: `Settlement of receivable ${payment.invoice.invoiceNumber}`,
        entityType: "invoice_payment",
        entityId: payment.id,
      },
    ],
  });

  await tx.invoicePayment.update({
    where: { id: payment.id },
    data: {
      journalEntryId: journal.id,
      accountingStatus: "POSTED",
      accountingPostedAt: new Date(),
      clearingAccountId: payment.clearingAccountId ?? debitAccountId,
    },
  });

  return journal;
}

export async function postVoucherTx(
  tx: TxClient,
  input: {
    orgId: string;
    voucherId: string;
    actorId?: string;
  },
) {
  const voucher = await tx.voucher.findFirst({
    where: {
      id: input.voucherId,
      organizationId: input.orgId,
    },
    include: {
      lines: true,
    },
  });

  if (!voucher) {
    throw new Error("Voucher not found.");
  }

  if (voucher.status !== "approved") {
    return null;
  }

  if (voucher.journalEntryId || voucher.accountingStatus === "POSTED") {
    return voucher.journalEntryId
      ? tx.journalEntry.findUnique({ where: { id: voucher.journalEntryId } })
      : null;
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
    SYSTEM_ACCOUNT_KEYS.BANK_CHARGES,
    SYSTEM_ACCOUNT_KEYS.SERVICE_REVENUE,
  ]);

  const offsetAccountId =
    voucher.type === "payment"
      ? accounts[SYSTEM_ACCOUNT_KEYS.BANK_CHARGES].id
      : accounts[SYSTEM_ACCOUNT_KEYS.SERVICE_REVENUE].id;

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "VOUCHER",
    sourceId: voucher.id,
    sourceRef: voucher.voucherNumber,
    entryDate: parseAccountingDate(voucher.voucherDate),
    actorId: input.actorId,
    memo: `Voucher ${voucher.voucherNumber}`,
    lines:
      voucher.type === "payment"
        ? [
            {
              accountId: offsetAccountId,
              debit: roundMoney(voucher.totalAmount),
              description: `Voucher ${voucher.voucherNumber}`,
              entityType: "voucher",
              entityId: voucher.id,
            },
            {
              accountId: accounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id,
              credit: roundMoney(voucher.totalAmount),
              description: `Cash out for voucher ${voucher.voucherNumber}`,
              entityType: "voucher",
              entityId: voucher.id,
            },
          ]
        : [
            {
              accountId: accounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id,
              debit: roundMoney(voucher.totalAmount),
              description: `Cash receipt for voucher ${voucher.voucherNumber}`,
              entityType: "voucher",
              entityId: voucher.id,
            },
            {
              accountId: offsetAccountId,
              credit: roundMoney(voucher.totalAmount),
              description: `Voucher ${voucher.voucherNumber}`,
              entityType: "voucher",
              entityId: voucher.id,
            },
          ],
  });

  await tx.voucher.update({
    where: { id: voucher.id },
    data: {
      journalEntryId: journal.id,
      accountingStatus: "POSTED",
      postedAt: new Date(),
    },
  });

  return journal;
}

export async function postVendorBillTx(
  tx: TxClient,
  input: {
    orgId: string;
    vendorBillId: string;
    actorId?: string;
  },
) {
  const bill = await tx.vendorBill.findFirst({
    where: {
      id: input.vendorBillId,
      orgId: input.orgId,
    },
    select: {
      id: true,
      billNumber: true,
      billDate: true,
      totalAmount: true,
      gstTotalCgst: true,
      gstTotalSgst: true,
      gstTotalIgst: true,
      gstTotalCess: true,
      status: true,
      expenseAccountId: true,
      journalEntryId: true,
      accountingStatus: true,
    },
  });

  if (!bill) {
    throw new Error("Vendor bill not found.");
  }

  if (
    bill.status !== "APPROVED" &&
    bill.status !== "OVERDUE" &&
    bill.status !== "PARTIALLY_PAID" &&
    bill.status !== "PAID"
  ) {
    return null;
  }

  if (bill.journalEntryId || bill.accountingStatus === "POSTED") {
    return bill.journalEntryId
      ? tx.journalEntry.findUnique({ where: { id: bill.journalEntryId } })
      : null;
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE,
    SYSTEM_ACCOUNT_KEYS.GST_INPUT_TAX,
    SYSTEM_ACCOUNT_KEYS.OPERATING_EXPENSES,
  ]);

  const defaults = await tx.orgDefaults.findUnique({
    where: { organizationId: input.orgId },
    select: { defaultExpenseAccountId: true },
  });

  const expenseAccountId =
    bill.expenseAccountId ??
    defaults?.defaultExpenseAccountId ??
    accounts[SYSTEM_ACCOUNT_KEYS.OPERATING_EXPENSES].id;

  const taxAmount = roundMoney(
    toAccountingNumber(bill.gstTotalCgst) +
      toAccountingNumber(bill.gstTotalSgst) +
      toAccountingNumber(bill.gstTotalIgst) +
      toAccountingNumber(bill.gstTotalCess),
  );
  const expenseAmount = roundMoney(toAccountingNumber(bill.totalAmount) - taxAmount);

  if (expenseAmount < 0) {
    throw new Error("Vendor bill expense amount cannot be negative.");
  }

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "VENDOR_BILL",
    sourceId: bill.id,
    sourceRef: bill.billNumber,
    entryDate: parseAccountingDate(bill.billDate),
    actorId: input.actorId,
    memo: `Vendor bill ${bill.billNumber}`,
    lines: [
      ...(expenseAmount > 0
        ? [
            {
              accountId: expenseAccountId,
              debit: expenseAmount,
              description: `Expense for vendor bill ${bill.billNumber}`,
              entityType: "vendor_bill",
              entityId: bill.id,
            },
          ]
        : []),
      ...(taxAmount > 0
        ? [
            {
              accountId: accounts[SYSTEM_ACCOUNT_KEYS.GST_INPUT_TAX].id,
              debit: taxAmount,
              description: `GST input for vendor bill ${bill.billNumber}`,
              entityType: "vendor_bill",
              entityId: bill.id,
            },
          ]
        : []),
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE].id,
        credit: roundMoney(bill.totalAmount),
        description: `Accounts payable for vendor bill ${bill.billNumber}`,
        entityType: "vendor_bill",
        entityId: bill.id,
      },
    ],
  });

  await tx.vendorBill.update({
    where: { id: bill.id },
    data: {
      journalEntryId: journal.id,
      accountingStatus: "POSTED",
      postedAt: new Date(),
    },
  });

  return journal;
}

export async function postVendorBillPaymentTx(
  tx: TxClient,
  input: {
    orgId: string;
    vendorBillPaymentId: string;
    actorId?: string;
  },
) {
  const payment = await tx.vendorBillPayment.findFirst({
    where: {
      id: input.vendorBillPaymentId,
      orgId: input.orgId,
    },
    include: {
      vendorBill: {
        select: {
          id: true,
          billNumber: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("Vendor bill payment not found.");
  }

  if (payment.status !== "SETTLED") {
    return null;
  }

  if (payment.journalEntryId || payment.accountingStatus === "POSTED") {
    return payment.journalEntryId
      ? tx.journalEntry.findUnique({ where: { id: payment.journalEntryId } })
      : null;
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE,
    SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
  ]);

  const creditAccountId =
    payment.clearingAccountId ?? accounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id;

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "VENDOR_BILL_PAYMENT",
    sourceId: payment.id,
    sourceRef: payment.vendorBill.billNumber,
    entryDate: payment.paidAt,
    actorId: input.actorId,
    memo: cleanText(payment.note) ?? `Payment for vendor bill ${payment.vendorBill.billNumber}`,
    lines: [
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE].id,
        debit: roundMoney(payment.amount),
        description: `Settlement of vendor bill ${payment.vendorBill.billNumber}`,
        entityType: "vendor_bill_payment",
        entityId: payment.id,
      },
      {
        accountId: creditAccountId,
        credit: roundMoney(payment.amount),
        description: `Cash out for vendor bill ${payment.vendorBill.billNumber}`,
        entityType: "vendor_bill_payment",
        entityId: payment.id,
      },
    ],
  });

  await tx.vendorBillPayment.update({
    where: { id: payment.id },
    data: {
      journalEntryId: journal.id,
      accountingStatus: "POSTED",
      accountingPostedAt: new Date(),
      clearingAccountId: payment.clearingAccountId ?? creditAccountId,
    },
  });

  return journal;
}

export async function postSalarySlipAccrualTx(
  tx: TxClient,
  input: {
    orgId: string;
    salarySlipId: string;
    actorId?: string;
  },
) {
  const salarySlip = await tx.salarySlip.findFirst({
    where: {
      id: input.salarySlipId,
      organizationId: input.orgId,
    },
    include: {
      components: true,
    },
  });

  if (!salarySlip) {
    throw new Error("Salary slip not found.");
  }

  if (salarySlip.status !== "released") {
    return null;
  }

  if (salarySlip.journalEntryId || salarySlip.accountingStatus === "POSTED") {
    return salarySlip.journalEntryId
      ? tx.journalEntry.findUnique({ where: { id: salarySlip.journalEntryId } })
      : null;
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.PAYROLL_EXPENSE,
    SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE,
    SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE,
  ]);

  const deductionTotal = roundMoney(
    salarySlip.components
      .filter((component) => component.type === "deduction")
      .reduce((sum, component) => sum + component.amount, 0),
  );
  const grossPay = roundMoney(salarySlip.grossPay);
  const netPay = roundMoney(salarySlip.netPay);

  if (grossPay <= 0) {
    throw new Error("Salary slips must have gross pay greater than zero before release.");
  }

  if (netPay < 0) {
    throw new Error("Salary slips cannot post a negative net pay.");
  }

  const journalLines = [
    {
      accountId: accounts[SYSTEM_ACCOUNT_KEYS.PAYROLL_EXPENSE].id,
      debit: grossPay,
      description: `Payroll expense ${salarySlip.slipNumber}`,
      entityType: "salary_slip",
      entityId: salarySlip.id,
    },
    ...(netPay > 0
      ? [
          {
            accountId: accounts[SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE].id,
            credit: netPay,
            description: `Payroll payable ${salarySlip.slipNumber}`,
            entityType: "salary_slip",
            entityId: salarySlip.id,
          },
        ]
      : []),
    ...(deductionTotal > 0
      ? [
          {
            accountId: accounts[SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE].id,
            credit: deductionTotal,
            description: `Deductions for ${salarySlip.slipNumber}`,
            entityType: "salary_slip",
            entityId: salarySlip.id,
          },
        ]
      : []),
  ];

  if (journalLines.length < 2) {
    throw new Error("Salary slips need payable or deduction amounts before release.");
  }

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "SALARY_SLIP",
    sourceId: salarySlip.id,
    sourceRef: salarySlip.slipNumber,
    entryDate: new Date(Date.UTC(salarySlip.year, salarySlip.month - 1, 1, 12, 0, 0, 0)),
    actorId: input.actorId,
    memo: `Salary accrual ${salarySlip.slipNumber}`,
    lines: journalLines,
  });

  await tx.salarySlip.update({
    where: { id: salarySlip.id },
    data: {
      journalEntryId: journal.id,
      accountingStatus: "POSTED",
      postedAt: new Date(),
    },
  });

  return journal;
}

export async function postSalarySlipPayoutTx(
  tx: TxClient,
  input: {
    orgId: string;
    salarySlipId: string;
    actorId?: string;
    paidAt?: Date;
  },
) {
  const salarySlip = await tx.salarySlip.findFirst({
    where: {
      id: input.salarySlipId,
      organizationId: input.orgId,
    },
    select: {
      id: true,
      slipNumber: true,
      netPay: true,
      journalEntryId: true,
      payoutJournalEntryId: true,
    },
  });

  if (!salarySlip) {
    throw new Error("Salary slip not found.");
  }

  if (!salarySlip.journalEntryId) {
    throw new Error("Salary accrual must be posted before payout.");
  }

  if (salarySlip.payoutJournalEntryId) {
    return tx.journalEntry.findUnique({ where: { id: salarySlip.payoutJournalEntryId } });
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE,
    SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
  ]);

  const journal = await createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "SALARY_SLIP",
    sourceId: salarySlip.id,
    sourceRef: `${salarySlip.slipNumber}-PAYOUT`,
    entryDate: input.paidAt ?? new Date(),
    actorId: input.actorId,
    memo: `Salary payout ${salarySlip.slipNumber}`,
    lines: [
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE].id,
        debit: roundMoney(salarySlip.netPay),
        description: `Payroll payout ${salarySlip.slipNumber}`,
        entityType: "salary_slip",
        entityId: salarySlip.id,
      },
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id,
        credit: roundMoney(salarySlip.netPay),
        description: `Bank payout ${salarySlip.slipNumber}`,
        entityType: "salary_slip",
        entityId: salarySlip.id,
      },
    ],
  });

  await tx.salarySlip.update({
    where: { id: salarySlip.id },
    data: {
      payoutJournalEntryId: journal.id,
      payoutPostedAt: new Date(),
    },
  });

  return journal;
}

export async function postTdsRecordTx(
  tx: TxClient,
  input: {
    orgId: string;
    tdsRecordId: string;
    actorId?: string;
  },
) {
  const existingJournal = await tx.journalEntry.findFirst({
    where: {
      orgId: input.orgId,
      source: "TDS",
      sourceId: input.tdsRecordId,
    },
    select: { id: true },
  });

  if (existingJournal) {
    return tx.journalEntry.findUnique({ where: { id: existingJournal.id } });
  }

  const record = await tx.tdsRecord.findFirst({
    where: {
      id: input.tdsRecordId,
      organizationId: input.orgId,
    },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });

  if (!record) {
    throw new Error("TDS record not found.");
  }

  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.TDS_RECEIVABLE,
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
  ]);

  return createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "TDS",
    sourceId: record.id,
    sourceRef: record.invoice.invoiceNumber,
    entryDate: record.createdAt,
    actorId: input.actorId,
    memo: `TDS receivable for ${record.invoice.invoiceNumber}`,
    lines: [
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.TDS_RECEIVABLE].id,
        debit: roundMoney(record.tdsAmount),
        description: `TDS receivable ${record.invoice.invoiceNumber}`,
        entityType: "tds_record",
        entityId: record.id,
      },
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE].id,
        credit: roundMoney(record.tdsAmount),
        description: `Reduce receivable for TDS ${record.invoice.invoiceNumber}`,
        entityType: "tds_record",
        entityId: record.id,
      },
    ],
  });
}
