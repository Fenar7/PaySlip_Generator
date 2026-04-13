import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getBooksBankingConfig,
  resetBooksBankingConfigForTests,
} from "../config";

const ORIGINAL_ENV = { ...process.env };

describe("Books banking config", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BANK_IMPORT_MAX_ROWS;
    delete process.env.BANK_IMPORT_MAX_FILE_SIZE_MB;
    delete process.env.RECON_MATCH_DATE_WINDOW_DAYS;
    delete process.env.RECON_MATCH_TOLERANCE_PAISE;
    resetBooksBankingConfigForTests();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    resetBooksBankingConfigForTests();
  });

  it("uses safe defaults when env vars are absent", () => {
    const config = getBooksBankingConfig();

    expect(config).toEqual({
      bankImportMaxRows: 5000,
      bankImportMaxFileSizeMb: 2,
      bankImportMaxFileSizeBytes: 2 * 1024 * 1024,
      reconMatchDateWindowDays: 7,
      reconMatchTolerancePaise: 1,
      reconMatchToleranceAmount: 0.01,
    });
  });

  it("parses configured tunables from env", () => {
    process.env.BANK_IMPORT_MAX_ROWS = "2500";
    process.env.BANK_IMPORT_MAX_FILE_SIZE_MB = "4";
    process.env.RECON_MATCH_DATE_WINDOW_DAYS = "10";
    process.env.RECON_MATCH_TOLERANCE_PAISE = "5";
    resetBooksBankingConfigForTests();

    const config = getBooksBankingConfig();

    expect(config.bankImportMaxRows).toBe(2500);
    expect(config.bankImportMaxFileSizeMb).toBe(4);
    expect(config.bankImportMaxFileSizeBytes).toBe(4 * 1024 * 1024);
    expect(config.reconMatchDateWindowDays).toBe(10);
    expect(config.reconMatchTolerancePaise).toBe(5);
    expect(config.reconMatchToleranceAmount).toBe(0.05);
  });

  it("rejects invalid tunable values", () => {
    process.env.RECON_MATCH_TOLERANCE_PAISE = "0";
    resetBooksBankingConfigForTests();

    expect(() => getBooksBankingConfig()).toThrow(
      "RECON_MATCH_TOLERANCE_PAISE must be a positive integer.",
    );
  });
});
