CREATE OR REPLACE FUNCTION "safe_books_text_to_date"(value TEXT)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;

  IF value ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN value::DATE;
  END IF;

  BEGIN
    RETURN (value::TIMESTAMPTZ AT TIME ZONE 'UTC')::DATE;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  BEGIN
    RETURN value::TIMESTAMP::DATE;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RAISE EXCEPTION 'Unable to normalize Books date value: %', value;
END;
$$;

ALTER TABLE "journal_entry"
  ALTER COLUMN "totalDebit" TYPE NUMERIC(18, 2) USING ROUND("totalDebit"::NUMERIC, 2),
  ALTER COLUMN "totalCredit" TYPE NUMERIC(18, 2) USING ROUND("totalCredit"::NUMERIC, 2),
  ALTER COLUMN "totalDebit" SET DEFAULT 0,
  ALTER COLUMN "totalCredit" SET DEFAULT 0;

ALTER TABLE "journal_line"
  ALTER COLUMN "debit" TYPE NUMERIC(18, 2) USING ROUND("debit"::NUMERIC, 2),
  ALTER COLUMN "credit" TYPE NUMERIC(18, 2) USING ROUND("credit"::NUMERIC, 2),
  ALTER COLUMN "debit" SET DEFAULT 0,
  ALTER COLUMN "credit" SET DEFAULT 0;

ALTER TABLE "bank_account"
  ALTER COLUMN "openingBalance" TYPE NUMERIC(18, 2) USING ROUND("openingBalance"::NUMERIC, 2),
  ALTER COLUMN "openingBalance" SET DEFAULT 0;

ALTER TABLE "bank_transaction"
  ALTER COLUMN "amount" TYPE NUMERIC(18, 2) USING ROUND("amount"::NUMERIC, 2),
  ALTER COLUMN "runningBalance" TYPE NUMERIC(18, 2) USING CASE
    WHEN "runningBalance" IS NULL THEN NULL
    ELSE ROUND("runningBalance"::NUMERIC, 2)
  END;

ALTER TABLE "bank_transaction_match"
  ALTER COLUMN "matchedAmount" TYPE NUMERIC(18, 2) USING ROUND("matchedAmount"::NUMERIC, 2);

ALTER TABLE "vendor_bill"
  ALTER COLUMN "billDate" TYPE DATE USING "safe_books_text_to_date"("billDate"),
  ALTER COLUMN "dueDate" TYPE DATE USING "safe_books_text_to_date"("dueDate"),
  ALTER COLUMN "subtotalAmount" TYPE NUMERIC(18, 2) USING ROUND("subtotalAmount"::NUMERIC, 2),
  ALTER COLUMN "taxAmount" TYPE NUMERIC(18, 2) USING ROUND("taxAmount"::NUMERIC, 2),
  ALTER COLUMN "totalAmount" TYPE NUMERIC(18, 2) USING ROUND("totalAmount"::NUMERIC, 2),
  ALTER COLUMN "amountPaid" TYPE NUMERIC(18, 2) USING ROUND("amountPaid"::NUMERIC, 2),
  ALTER COLUMN "remainingAmount" TYPE NUMERIC(18, 2) USING ROUND("remainingAmount"::NUMERIC, 2),
  ALTER COLUMN "gstTotalCgst" TYPE NUMERIC(18, 2) USING ROUND("gstTotalCgst"::NUMERIC, 2),
  ALTER COLUMN "gstTotalSgst" TYPE NUMERIC(18, 2) USING ROUND("gstTotalSgst"::NUMERIC, 2),
  ALTER COLUMN "gstTotalIgst" TYPE NUMERIC(18, 2) USING ROUND("gstTotalIgst"::NUMERIC, 2),
  ALTER COLUMN "gstTotalCess" TYPE NUMERIC(18, 2) USING ROUND("gstTotalCess"::NUMERIC, 2),
  ALTER COLUMN "subtotalAmount" SET DEFAULT 0,
  ALTER COLUMN "taxAmount" SET DEFAULT 0,
  ALTER COLUMN "totalAmount" SET DEFAULT 0,
  ALTER COLUMN "amountPaid" SET DEFAULT 0,
  ALTER COLUMN "remainingAmount" SET DEFAULT 0,
  ALTER COLUMN "gstTotalCgst" SET DEFAULT 0,
  ALTER COLUMN "gstTotalSgst" SET DEFAULT 0,
  ALTER COLUMN "gstTotalIgst" SET DEFAULT 0,
  ALTER COLUMN "gstTotalCess" SET DEFAULT 0;

ALTER TABLE "vendor_bill_payment"
  ALTER COLUMN "amount" TYPE NUMERIC(18, 2) USING ROUND("amount"::NUMERIC, 2);

ALTER TABLE "payment_run"
  ALTER COLUMN "totalAmount" TYPE NUMERIC(18, 2) USING ROUND("totalAmount"::NUMERIC, 2),
  ALTER COLUMN "totalAmount" SET DEFAULT 0;

ALTER TABLE "payment_run_item"
  ALTER COLUMN "proposedAmount" TYPE NUMERIC(18, 2) USING ROUND("proposedAmount"::NUMERIC, 2),
  ALTER COLUMN "approvedAmount" TYPE NUMERIC(18, 2) USING CASE
    WHEN "approvedAmount" IS NULL THEN NULL
    ELSE ROUND("approvedAmount"::NUMERIC, 2)
  END;

ALTER TABLE "invoice"
  ALTER COLUMN "invoiceDate" TYPE DATE USING "safe_books_text_to_date"("invoiceDate"),
  ALTER COLUMN "dueDate" TYPE DATE USING "safe_books_text_to_date"("dueDate"),
  ALTER COLUMN "totalAmount" TYPE NUMERIC(18, 2) USING ROUND("totalAmount"::NUMERIC, 2),
  ALTER COLUMN "amountPaid" TYPE NUMERIC(18, 2) USING ROUND("amountPaid"::NUMERIC, 2),
  ALTER COLUMN "remainingAmount" TYPE NUMERIC(18, 2) USING ROUND("remainingAmount"::NUMERIC, 2),
  ALTER COLUMN "gstTotalCgst" TYPE NUMERIC(18, 2) USING ROUND("gstTotalCgst"::NUMERIC, 2),
  ALTER COLUMN "gstTotalSgst" TYPE NUMERIC(18, 2) USING ROUND("gstTotalSgst"::NUMERIC, 2),
  ALTER COLUMN "gstTotalIgst" TYPE NUMERIC(18, 2) USING ROUND("gstTotalIgst"::NUMERIC, 2),
  ALTER COLUMN "gstTotalCess" TYPE NUMERIC(18, 2) USING ROUND("gstTotalCess"::NUMERIC, 2),
  ALTER COLUMN "totalAmount" SET DEFAULT 0,
  ALTER COLUMN "amountPaid" SET DEFAULT 0,
  ALTER COLUMN "remainingAmount" SET DEFAULT 0,
  ALTER COLUMN "gstTotalCgst" SET DEFAULT 0,
  ALTER COLUMN "gstTotalSgst" SET DEFAULT 0,
  ALTER COLUMN "gstTotalIgst" SET DEFAULT 0,
  ALTER COLUMN "gstTotalCess" SET DEFAULT 0;

ALTER TABLE "invoice_payment"
  ALTER COLUMN "amount" TYPE NUMERIC(18, 2) USING ROUND("amount"::NUMERIC, 2);

DROP FUNCTION "safe_books_text_to_date";
