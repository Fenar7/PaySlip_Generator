import "server-only";

import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import type { BankStatementMapping } from "@/lib/accounting/banking";

/**
 * Known bank format profiles for auto-detection. Each entry maps column
 * header fragments (lowercased, trimmed) to our internal mapping fields.
 */

interface BankFormatProfile {
  name: string;
  /** Unique header substring(s) used to identify this format (any one must match) */
  identifyingHeaders: string[];
  mapping: Partial<BankStatementMapping>;
}

const KNOWN_FORMATS: BankFormatProfile[] = [
  {
    name: "HDFC Bank",
    identifyingHeaders: ["narration", "chq./ref.no.", "withdrawal amt.", "deposit amt."],
    mapping: {
      dateColumn: "Date",
      descriptionColumn: "Narration",
      referenceColumn: "Chq./Ref.No.",
      debitColumn: "Withdrawal Amt.",
      creditColumn: "Deposit Amt.",
      balanceColumn: "Closing Balance",
      dateFormat: "DMY",
    },
  },
  {
    name: "ICICI Bank",
    identifyingHeaders: ["transaction remarks", "withdrawal amount (inr", "deposit amount (inr"],
    mapping: {
      dateColumn: "Transaction Date",
      descriptionColumn: "Transaction Remarks",
      referenceColumn: "Cheque Number",
      debitColumn: "Withdrawal Amount (INR )",
      creditColumn: "Deposit Amount (INR )",
      balanceColumn: "Balance (INR )",
      dateFormat: "DMY",
    },
  },
  {
    name: "SBI",
    identifyingHeaders: ["txn date", "value date", "ref no./cheque no."],
    mapping: {
      dateColumn: "Txn Date",
      valueDateColumn: "Value Date",
      descriptionColumn: "Description",
      referenceColumn: "Ref No./Cheque No.",
      debitColumn: "Debit",
      creditColumn: "Credit",
      balanceColumn: "Balance",
      dateFormat: "DMY",
    },
  },
  {
    name: "Axis Bank",
    identifyingHeaders: ["tran date", "chq no", "particulars", "withdrawal (dr)", "deposit (cr)"],
    mapping: {
      dateColumn: "Tran Date",
      descriptionColumn: "Particulars",
      referenceColumn: "Chq No",
      debitColumn: "Withdrawal (Dr)",
      creditColumn: "Deposit (Cr)",
      balanceColumn: "Closing Balance (INR)",
      dateFormat: "DMY",
    },
  },
  {
    name: "Kotak Bank",
    identifyingHeaders: ["transaction id", "debit amount", "credit amount", "available balance"],
    mapping: {
      dateColumn: "Transaction Date",
      descriptionColumn: "Description",
      referenceColumn: "Transaction ID",
      debitColumn: "Debit Amount",
      creditColumn: "Credit Amount",
      balanceColumn: "Available Balance",
      dateFormat: "DMY",
    },
  },
];

/**
 * Attempt to auto-detect the bank format from a set of column headers.
 * Returns a partial mapping profile if a known format is detected, or null.
 */
export function detectBankFormat(
  headers: string[],
): { bankName: string; mapping: Partial<BankStatementMapping> } | null {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  for (const fmt of KNOWN_FORMATS) {
    const matched = fmt.identifyingHeaders.some((fragment) =>
      normalized.some((h) => h.includes(fragment.toLowerCase())),
    );
    if (matched) {
      return { bankName: fmt.name, mapping: fmt.mapping };
    }
  }

  return null;
}

/**
 * Converts an XLSX/XLS file buffer into a CSV text string.
 * Reads the first non-empty sheet by default. Handles merged cells and
 * blank header rows common in bank export files.
 *
 * @throws {Error} if the buffer cannot be parsed as a valid workbook.
 */
export function xlsxToCsvText(
  buffer: Buffer,
  opts: { sheetIndex?: number } = {},
): string {
  const workbook = xlsxRead(buffer, { type: "buffer", cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error("The uploaded file contains no sheets.");
  }

  const targetName = sheetNames[opts.sheetIndex ?? 0];
  const sheet = workbook.Sheets[targetName];

  if (!sheet) {
    throw new Error(`Sheet "${targetName}" not found in the workbook.`);
  }

  // sheet_to_csv converts all values to strings, preserving the structure.
  // `blankrows: false` removes trailing empty rows that banks sometimes include.
  return xlsxUtils.sheet_to_csv(sheet, { blankrows: false });
}

/**
 * Detect whether the given file name refers to an XLSX or XLS file.
 */
export function isXlsxFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
