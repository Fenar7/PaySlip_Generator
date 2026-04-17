import { describe, it, expect } from "vitest";
import {
  scoreMatch,
  getDisposition,
  AUTO_CONFIRM_THRESHOLD,
  SUGGEST_THRESHOLD,
  type MatchInput,
  type CandidateInput,
} from "../match-scorer";
import { detectBankFormat, isXlsxFile } from "../statement-parser";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = new Date("2025-04-01T00:00:00Z");
const twoDaysAgo = new Date("2025-03-30T00:00:00Z");
const tenDaysAgo = new Date("2025-03-22T00:00:00Z");

function bank(overrides: Partial<MatchInput> = {}): MatchInput {
  return {
    bankAmount: 10000,
    bankDate: today,
    bankReference: null,
    bankNormalizedPayee: null,
    bankDescription: "NEFT CR 12345 ACME CORP",
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    candidateAmount: 10000,
    candidateDate: today,
    candidateReference: null,
    candidatePartyName: null,
    isSingleOpenDocForParty: false,
    ...overrides,
  };
}

// ─── scoreMatch: amount signals ───────────────────────────────────────────────

describe("scoreMatch — amount signals", () => {
  it("gives exactAmount signal for identical amounts", () => {
    const result = scoreMatch(bank({ bankAmount: 5000 }), candidate({ candidateAmount: 5000 }));
    expect(result.signals.exactAmount).toBe(true);
    expect(result.signals.amountWithin1Pct).toBe(false);
  });

  it("gives amountWithin1Pct for amount within 1% tolerance", () => {
    // 10000 vs 9950 = 0.5% difference
    const result = scoreMatch(
      bank({ bankAmount: 10000 }),
      candidate({ candidateAmount: 9950 }),
    );
    expect(result.signals.exactAmount).toBe(false);
    expect(result.signals.amountWithin1Pct).toBe(true);
  });

  it("gives no amount signal for amount more than 1% off", () => {
    const result = scoreMatch(
      bank({ bankAmount: 10000 }),
      candidate({ candidateAmount: 9000 }),
    );
    expect(result.signals.exactAmount).toBe(false);
    expect(result.signals.amountWithin1Pct).toBe(false);
  });
});

// ─── scoreMatch: date signals ─────────────────────────────────────────────────

describe("scoreMatch — date signals", () => {
  it("gives dateWithin3Days for same-day dates", () => {
    const result = scoreMatch(bank({ bankDate: today }), candidate({ candidateDate: today }));
    expect(result.signals.dateWithin3Days).toBe(true);
  });

  it("gives dateWithin3Days for 2-day difference", () => {
    const result = scoreMatch(
      bank({ bankDate: today }),
      candidate({ candidateDate: twoDaysAgo }),
    );
    expect(result.signals.dateWithin3Days).toBe(true);
  });

  it("does not give dateWithin3Days for 10-day difference", () => {
    const result = scoreMatch(
      bank({ bankDate: today }),
      candidate({ candidateDate: tenDaysAgo }),
    );
    expect(result.signals.dateWithin3Days).toBe(false);
  });
});

// ─── scoreMatch: text / reference signals ─────────────────────────────────────

describe("scoreMatch — reference and payer name signals", () => {
  it("gives utrReferenceMatch when bank description contains candidate reference", () => {
    const result = scoreMatch(
      bank({ bankDescription: "NEFT CR INV-2024-0042 ACME CORP" }),
      candidate({ candidateReference: "INV-2024-0042" }),
    );
    expect(result.signals.utrReferenceMatch).toBe(true);
  });

  it("gives payerNameMatch when normalizedPayee contains party name", () => {
    const result = scoreMatch(
      bank({ bankNormalizedPayee: "acme corp pvt ltd" }),
      candidate({ candidatePartyName: "Acme Corp" }),
    );
    expect(result.signals.payerNameMatch).toBe(true);
  });

  it("does not give payerNameMatch for short party names (≤ 2 chars)", () => {
    const result = scoreMatch(
      bank({ bankDescription: "AB PAYMENT" }),
      candidate({ candidatePartyName: "AB" }),
    );
    expect(result.signals.payerNameMatch).toBe(false);
  });
});

// ─── scoreMatch: single open doc signal ───────────────────────────────────────

describe("scoreMatch — singleOpenDoc signal", () => {
  it("gives singleOpenDoc signal when isSingleOpenDocForParty is true", () => {
    const result = scoreMatch(bank(), candidate({ isSingleOpenDocForParty: true }));
    expect(result.signals.singleOpenDoc).toBe(true);
  });

  it("does not give singleOpenDoc signal when false", () => {
    const result = scoreMatch(bank(), candidate({ isSingleOpenDocForParty: false }));
    expect(result.signals.singleOpenDoc).toBe(false);
  });
});

// ─── scoreMatch: confidence and disposition ───────────────────────────────────

describe("scoreMatch — confidence thresholds", () => {
  it("produces AUTO_CONFIRM for exact amount + UTR ref + date + singleOpen (95 pts)", () => {
    // 40 (exact) + 20 (UTR) + 20 (date) + 15 (singleOpen) = 95
    const result = scoreMatch(
      bank({ bankDescription: "NEFT CR INV-0042", bankReference: "UTR12345" }),
      candidate({
        candidateReference: "INV-0042",
        isSingleOpenDocForParty: true,
      }),
    );
    expect(result.confidence).toBe(95);
    expect(result.disposition).toBe("AUTO_CONFIRM");
  });

  it("produces SUGGEST for exact amount + date only (60 pts)", () => {
    // 40 + 20 = 60, below SUGGEST_THRESHOLD
    const result = scoreMatch(bank(), candidate());
    expect(result.confidence).toBe(60);
    expect(result.disposition).toBe("IGNORE");
  });

  it("produces SUGGEST for exact amount + date + payer name (70 pts)", () => {
    // 40 + 20 + 10 = 70
    const result = scoreMatch(
      bank({ bankNormalizedPayee: "acme corporation" }),
      candidate({ candidatePartyName: "Acme Corporation" }),
    );
    expect(result.confidence).toBe(70);
    expect(result.disposition).toBe("SUGGEST");
  });

  it("produces IGNORE for amount only (no date match, nothing else)", () => {
    const result = scoreMatch(
      bank({ bankDate: today }),
      candidate({ candidateDate: tenDaysAgo }), // no date signal
    );
    expect(result.signals.exactAmount).toBe(true);
    expect(result.signals.dateWithin3Days).toBe(false);
    expect(result.confidence).toBe(40);
    expect(result.disposition).toBe("IGNORE");
  });

  it("caps confidence at 100 even when all signals fire", () => {
    // 40 + 20 + 10 + 20 + 15 = 105, must cap at 100
    const result = scoreMatch(
      bank({
        bankNormalizedPayee: "acme corp",
        bankDescription: "NEFT CR INV-0099",
      }),
      candidate({
        candidatePartyName: "Acme Corp",
        candidateReference: "INV-0099",
        isSingleOpenDocForParty: true,
      }),
    );
    expect(result.confidence).toBe(100);
    expect(result.disposition).toBe("AUTO_CONFIRM");
  });
});

// ─── getDisposition ───────────────────────────────────────────────────────────

describe("getDisposition", () => {
  it("returns AUTO_CONFIRM at threshold", () => {
    expect(getDisposition(AUTO_CONFIRM_THRESHOLD)).toBe("AUTO_CONFIRM");
    expect(getDisposition(100)).toBe("AUTO_CONFIRM");
  });

  it("returns SUGGEST between thresholds", () => {
    expect(getDisposition(SUGGEST_THRESHOLD)).toBe("SUGGEST");
    expect(getDisposition(80)).toBe("SUGGEST");
    expect(getDisposition(AUTO_CONFIRM_THRESHOLD - 1)).toBe("SUGGEST");
  });

  it("returns IGNORE below SUGGEST_THRESHOLD", () => {
    expect(getDisposition(SUGGEST_THRESHOLD - 1)).toBe("IGNORE");
    expect(getDisposition(0)).toBe("IGNORE");
  });
});

// ─── statement-parser: detectBankFormat ──────────────────────────────────────

describe("detectBankFormat", () => {
  it("detects HDFC format by Narration header", () => {
    const result = detectBankFormat(["Date", "Narration", "Chq./Ref.No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]);
    expect(result).not.toBeNull();
    expect(result?.bankName).toBe("HDFC Bank");
    expect(result?.mapping.dateColumn).toBe("Date");
    expect(result?.mapping.debitColumn).toBe("Withdrawal Amt.");
  });

  it("detects ICICI format by Transaction Remarks header", () => {
    const result = detectBankFormat([
      "Transaction Date",
      "Transaction Remarks",
      "Withdrawal Amount (INR )",
      "Deposit Amount (INR )",
      "Balance (INR )",
    ]);
    expect(result).not.toBeNull();
    expect(result?.bankName).toBe("ICICI Bank");
  });

  it("detects SBI format by Txn Date header", () => {
    const result = detectBankFormat(["Txn Date", "Value Date", "Ref No./Cheque No.", "Description", "Debit", "Credit", "Balance"]);
    expect(result).not.toBeNull();
    expect(result?.bankName).toBe("SBI");
  });

  it("returns null for unknown header sets", () => {
    const result = detectBankFormat(["TransDate", "Memo", "Amount"]);
    expect(result).toBeNull();
  });
});

// ─── statement-parser: isXlsxFile ─────────────────────────────────────────────

describe("isXlsxFile", () => {
  it("returns true for .xlsx extension", () => {
    expect(isXlsxFile("bank_statement.xlsx")).toBe(true);
  });

  it("returns true for .xls extension", () => {
    expect(isXlsxFile("HDFC_Statement.xls")).toBe(true);
  });

  it("returns false for .csv files", () => {
    expect(isXlsxFile("statement.csv")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isXlsxFile("Statement.XLSX")).toBe(true);
  });
});
