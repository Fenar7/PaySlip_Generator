import "server-only";

export interface BooksBankingConfig {
  bankImportMaxRows: number;
  bankImportMaxFileSizeMb: number;
  bankImportMaxFileSizeBytes: number;
  reconMatchDateWindowDays: number;
  reconMatchTolerancePaise: number;
  reconMatchToleranceAmount: number;
}

const DEFAULT_BOOKS_BANKING_CONFIG = {
  bankImportMaxRows: 5000,
  bankImportMaxFileSizeMb: 2,
  reconMatchDateWindowDays: 7,
  reconMatchTolerancePaise: 1,
} as const;

let cachedBooksBankingConfig: BooksBankingConfig | null = null;

function parsePositiveIntegerEnv(
  key: string,
  fallback: number,
): number {
  const raw = process.env[key]?.trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}

export function getBooksBankingConfig(): BooksBankingConfig {
  if (cachedBooksBankingConfig) {
    return cachedBooksBankingConfig;
  }

  const bankImportMaxRows = parsePositiveIntegerEnv(
    "BANK_IMPORT_MAX_ROWS",
    DEFAULT_BOOKS_BANKING_CONFIG.bankImportMaxRows,
  );
  const bankImportMaxFileSizeMb = parsePositiveIntegerEnv(
    "BANK_IMPORT_MAX_FILE_SIZE_MB",
    DEFAULT_BOOKS_BANKING_CONFIG.bankImportMaxFileSizeMb,
  );
  const reconMatchDateWindowDays = parsePositiveIntegerEnv(
    "RECON_MATCH_DATE_WINDOW_DAYS",
    DEFAULT_BOOKS_BANKING_CONFIG.reconMatchDateWindowDays,
  );
  const reconMatchTolerancePaise = parsePositiveIntegerEnv(
    "RECON_MATCH_TOLERANCE_PAISE",
    DEFAULT_BOOKS_BANKING_CONFIG.reconMatchTolerancePaise,
  );

  cachedBooksBankingConfig = {
    bankImportMaxRows,
    bankImportMaxFileSizeMb,
    bankImportMaxFileSizeBytes: bankImportMaxFileSizeMb * 1024 * 1024,
    reconMatchDateWindowDays,
    reconMatchTolerancePaise,
    reconMatchToleranceAmount: reconMatchTolerancePaise / 100,
  };

  return cachedBooksBankingConfig;
}

export function resetBooksBankingConfigForTests() {
  cachedBooksBankingConfig = null;
}
