# Requirements Document

## Introduction

Phase 16 (SW Books - Accounting Core + Bank Reconciliation + Financial Close) has been successfully implemented and merged to master. However, a comprehensive security audit and feature completeness analysis has identified 43 critical issues that must be addressed to ensure the SW Books module meets production-grade security, compliance, and functional requirements.

This specification addresses three categories of issues:
- **13 Security Vulnerabilities** (High/Critical severity) - insufficient access control, missing approval enforcement, input validation gaps, and data exposure risks
- **15 Missing PRD Features** (High severity) - incomplete audit logging, unenforced close workflow blockers, incomplete reconciliation engine, and missing edge case handling
- **15 Code Quality Issues** (Medium severity) - generic error messages, missing validation, performance issues, and incomplete audit trails

The goal is to harden the SW Books module to production-ready status with comprehensive security controls, complete audit coverage, enforced business rules, and robust edge case handling.

## Glossary

- **SW_Books**: The accounting and financial management suite within Slipwise One
- **Finance_User**: A user with one of the finance roles (Owner, Admin, Accountant, Approver, Auditor, Viewer)
- **Accounting_Entity**: A core accounting object (journal entry, vendor bill, payment run, bank transaction, fiscal period)
- **Approval_Authority**: The permission level required to approve finance-critical operations
- **Close_Blocker**: A condition that prevents fiscal period close until resolved
- **Reconciliation_Engine**: The system that matches bank transactions to internal financial events
- **Audit_Event**: A structured, immutable record of a finance-critical state transition
- **Organization_Boundary**: The security perimeter that prevents cross-org data access
- **Fiscal_Period**: A time period (typically monthly) for which financial transactions are grouped and closed
- **Posted_Journal**: An immutable journal entry that has been committed to the general ledger
- **Payment_Run**: A batch payment operation for multiple vendor bills
- **Bank_Transaction**: A line item from an imported bank statement
- **Match_Confidence**: A score indicating the likelihood that a bank transaction matches an internal event
- **Suspense_Account**: A temporary holding account for unmatched bank transactions
- **Clearing_Account**: An intermediate account used between payment receipt and bank settlement
- **Overpayment**: A payment amount that exceeds the outstanding balance
- **Partial_Match**: A bank transaction matched to multiple internal events or vice versa
- **Internal_Transfer**: A movement of funds between two bank accounts owned by the same organization
- **Reversal_Chain**: A sequence of journal entries where each reverses the previous one
- **Account_Hierarchy**: The parent-child relationship structure of GL accounts
- **Trial_Balance**: A report showing all account balances that must sum to zero
- **Financial_Statement**: A formal report (P&L, Balance Sheet, Cash Flow) derived from the general ledger
- **GST_Tie_Out**: Validation that GST control accounts match operational GST records
- **TDS_Tie_Out**: Validation that TDS control accounts match operational TDS records
- **Audit_Package**: A comprehensive export of all financial records for external audit

## Requirements

### Requirement 1: Granular Role-Based Access Control

**User Story:** As a system administrator, I want granular role-based permissions for SW Books, so that I can enforce separation of duties and least-privilege access.

#### Acceptance Criteria

1. THE SW_Books SHALL support six distinct finance roles: Owner, Admin, Accountant, Approver, Auditor, Viewer
2. WHEN a Finance_User attempts to access an Accounting_Entity, THE SW_Books SHALL verify the user has the required permission for that entity type and action
3. THE SW_Books SHALL enforce read-only access for Auditor and Viewer roles on all write operations
4. THE SW_Books SHALL restrict period reopen and close operations to Owner and Admin roles only
5. THE SW_Books SHALL restrict journal posting and vendor bill approval to Accountant, Admin, and Owner roles
6. THE SW_Books SHALL allow Approver role to approve payment runs and vendor bills but not post journals
7. WHEN a Finance_User attempts a privileged operation, THE SW_Books SHALL validate role permissions before executing the operation
8. THE SW_Books SHALL log all permission denial events to the audit log with user, action, and reason

### Requirement 2: Approval Workflow Enforcement

**User Story:** As a finance manager, I want mandatory approval workflows for critical operations, so that no single person can execute high-risk financial transactions without oversight.

#### Acceptance Criteria

1. WHEN a Payment_Run is created with total amount exceeding the approval threshold, THE SW_Books SHALL require approval before execution
2. WHEN a Fiscal_Period reopen is requested, THE SW_Books SHALL create an approval request and block the reopen until approved
3. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL require approval if configured in organization settings
4. THE SW_Books SHALL prevent payment run execution if the approval status is "PENDING" or "REJECTED"
5. WHEN an approval request is rejected, THE SW_Books SHALL update the related entity status to reflect the rejection
6. THE SW_Books SHALL validate that the approver has Approval_Authority before accepting the approval
7. THE SW_Books SHALL prevent self-approval (requester cannot approve their own request)
8. WHEN an approval is granted or denied, THE SW_Books SHALL create an Audit_Event with approver identity, timestamp, and decision reason

### Requirement 3: Input Validation at Action Layer

**User Story:** As a security engineer, I want comprehensive input validation before service calls, so that malicious or malformed data cannot reach the business logic layer.

#### Acceptance Criteria

1. WHEN a journal entry is submitted, THE SW_Books SHALL validate all line items have valid account IDs, non-negative amounts, and balanced debits/credits before calling the service layer
2. WHEN a bank statement is imported, THE SW_Books SHALL validate file type, size limits, required columns, and date formats before processing
3. WHEN a vendor bill is created, THE SW_Books SHALL validate vendor ID exists, line items are non-empty, amounts are positive, and due date is valid
4. WHEN a reconciliation match is confirmed, THE SW_Books SHALL validate the match amount does not exceed available amounts on either side
5. THE SW_Books SHALL return structured validation errors with field names and specific error messages (not generic "invalid input")
6. THE SW_Books SHALL sanitize all text inputs to prevent injection attacks before database operations
7. WHEN a fiscal period operation is requested, THE SW_Books SHALL validate the period exists, belongs to the organization, and is in a valid state for the operation
8. THE SW_Books SHALL validate all date inputs are within reasonable bounds (not in distant past or future) and match expected formats

### Requirement 4: Organization Boundary Enforcement

**User Story:** As a security auditor, I want strict organization boundary checks on all data access, so that users cannot access or modify data belonging to other organizations.

#### Acceptance Criteria

1. WHEN a Finance_User requests an Accounting_Entity, THE SW_Books SHALL verify the entity's orgId matches the user's organization before returning data
2. WHEN a journal entry is posted, THE SW_Books SHALL verify all referenced accounts belong to the same organization
3. WHEN a bank transaction match is created, THE SW_Books SHALL verify the bank transaction and matched entity belong to the same organization
4. WHEN a vendor bill payment is recorded, THE SW_Books SHALL verify the vendor bill, vendor, and payment all belong to the same organization
5. THE SW_Books SHALL include organization ID in all database queries for Accounting_Entity retrieval
6. WHEN a cross-org access attempt is detected, THE SW_Books SHALL log a security event and return a "not found" error (not "access denied")
7. THE SW_Books SHALL validate organization boundaries in transaction blocks before committing changes
8. WHEN exporting audit packages or reports, THE SW_Books SHALL filter all data by the requesting user's organization ID

### Requirement 5: Sensitive Data Filtering for Exports

**User Story:** As a compliance officer, I want role-based data filtering on exports, so that sensitive financial data is only accessible to authorized users.

#### Acceptance Criteria

1. WHEN an Auditor or Viewer exports a trial balance, THE SW_Books SHALL exclude vendor payment details and employee salary information
2. WHEN a non-Admin user exports an audit package, THE SW_Books SHALL exclude user identity information and approval decision notes
3. THE SW_Books SHALL include a data classification marker in all export files indicating the sensitivity level
4. WHEN a financial statement is exported, THE SW_Books SHALL include only aggregated totals for Viewer role (no line-item detail)
5. THE SW_Books SHALL log all export operations with user identity, export type, date range, and record count
6. WHEN a bank reconciliation report is exported, THE SW_Books SHALL mask bank account numbers except the last 4 digits for non-Admin users
7. THE SW_Books SHALL prevent export of unposted draft journals by Auditor and Viewer roles
8. WHEN an export contains personally identifiable information, THE SW_Books SHALL require additional confirmation from the user

### Requirement 6: Comprehensive Audit Logging

**User Story:** As an auditor, I want complete audit trails for all finance-critical operations, so that I can trace every financial state change to a specific user and timestamp.

#### Acceptance Criteria

1. WHEN a journal entry is posted, THE SW_Books SHALL create an Audit_Event with journal ID, entry number, source type, actor ID, and timestamp
2. WHEN a journal entry is reversed, THE SW_Books SHALL create an Audit_Event with original journal ID, reversal journal ID, actor ID, reason, and timestamp
3. WHEN a vendor bill is approved, THE SW_Books SHALL create an Audit_Event with bill ID, bill number, approver ID, approval timestamp, and decision notes
4. WHEN a payment run is executed, THE SW_Books SHALL create an Audit_Event with run ID, run number, executor ID, execution timestamp, and item count
5. WHEN a bank transaction is matched, THE SW_Books SHALL create an Audit_Event with transaction ID, match entity type, match entity ID, matched amount, and confidence score
6. WHEN a bank transaction match is rejected, THE SW_Books SHALL create an Audit_Event with transaction ID, rejected match ID, actor ID, and rejection reason
7. WHEN a fiscal period is reopened, THE SW_Books SHALL create an Audit_Event with period ID, period label, actor ID, reopen reason, and timestamp
8. WHEN a fiscal period close is completed, THE SW_Books SHALL create an Audit_Event with period ID, close run ID, actor ID, completion timestamp, and blocker resolution summary
9. WHEN a bank statement import fails, THE SW_Books SHALL create an Audit_Event with import ID, file name, failure reason, failed row count, and error details
10. WHEN a reconciliation suggestion is generated, THE SW_Books SHALL log the suggestion count, confidence score range, and generation timestamp

### Requirement 7: Close Workflow Blocker Enforcement

**User Story:** As a finance manager, I want enforced close blockers, so that fiscal periods cannot be closed with unresolved exceptions or incomplete reconciliation.

#### Acceptance Criteria

1. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL check for unmatched bank transactions and block close if any exist
2. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL check for pending approval requests and block close if any exist
3. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL check for unposted journals and block close if any exist
4. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL validate AR aging ties to receivables ledger within tolerance and block close if variance exceeds threshold
5. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL validate AP aging ties to payables ledger within tolerance and block close if variance exceeds threshold
6. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL validate GST control accounts tie to operational GST records and block close if variance exceeds threshold
7. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL validate TDS control accounts tie to operational TDS records and block close if variance exceeds threshold
8. THE SW_Books SHALL assign severity levels to close tasks: "blocker" (must resolve), "warning" (should review), "info" (optional)
9. WHEN all blocker tasks are resolved, THE SW_Books SHALL update close run status to "READY" and allow close completion
10. WHEN a close blocker is resolved, THE SW_Books SHALL update the close task status and recalculate the blocker count

### Requirement 8: Enhanced Reconciliation Engine

**User Story:** As an accountant, I want a robust reconciliation engine with edge case handling, so that all bank transactions can be accurately matched without data corruption.

#### Acceptance Criteria

1. WHEN a bank transaction match is confirmed, THE SW_Books SHALL validate the matched amount does not exceed the remaining unmatched amount on the bank transaction
2. WHEN a bank transaction match is confirmed, THE SW_Books SHALL validate the matched amount does not exceed the available amount on the matched entity
3. WHEN a Razorpay settlement is imported, THE SW_Books SHALL split the settlement into gross receipt and gateway fee components
4. WHEN two bank transactions are identified as an Internal_Transfer, THE SW_Books SHALL create a single journal entry debiting one bank account and crediting the other
5. WHEN a bank statement is imported, THE SW_Books SHALL calculate a checksum and reject duplicate imports with the same checksum
6. WHEN a bank transaction fingerprint matches an existing transaction, THE SW_Books SHALL reject the duplicate and log the rejection reason
7. THE SW_Books SHALL calculate a Match_Confidence score for each suggested match based on amount, date, reference, and entity type
8. WHEN a partial match is created, THE SW_Books SHALL update the bank transaction status to "PARTIALLY_MATCHED" and track the remaining unmatched amount
9. WHEN a bank transaction is fully matched, THE SW_Books SHALL update the status to "MATCHED" and prevent further match attempts
10. WHEN a bank transaction has no matches, THE SW_Books SHALL allow manual journal creation to post to Suspense_Account

### Requirement 9: Complete Financial Statements

**User Story:** As a CFO, I want complete financial statements with validation, so that I can rely on the reports for decision-making and compliance.

#### Acceptance Criteria

1. THE SW_Books SHALL generate an indirect cash flow statement showing operating, investing, and financing activities
2. WHEN a cash flow statement is generated, THE SW_Books SHALL reconcile the net cash movement to the change in bank account balances
3. WHEN a P&L is generated, THE SW_Books SHALL validate that revenue minus expenses equals net profit
4. WHEN a balance sheet is generated, THE SW_Books SHALL validate that assets equal liabilities plus equity
5. THE SW_Books SHALL support comparative period reporting showing current period, prior period, and variance
6. WHEN a financial statement is generated, THE SW_Books SHALL create a snapshot with generation timestamp, period, and data hash
7. THE SW_Books SHALL implement a retention policy for financial statement snapshots (retain for 7 years)
8. WHEN GST tie-out is requested, THE SW_Books SHALL compare GST control account balances to operational GST totals and report variance
9. WHEN TDS tie-out is requested, THE SW_Books SHALL compare TDS control account balances to operational TDS totals and report variance
10. THE SW_Books SHALL allow drill-down from financial statement line items to underlying journal entries

### Requirement 10: Edge Case Handling - Overpayments

**User Story:** As an accountant, I want overpayment detection and handling, so that payment amounts exceeding outstanding balances are flagged and reviewed.

#### Acceptance Criteria

1. WHEN a vendor bill payment amount exceeds the remaining balance, THE SW_Books SHALL reject the payment and return an error message with the remaining balance
2. WHEN an invoice payment amount exceeds the outstanding balance, THE SW_Books SHALL flag the payment for review and post the excess to a customer credit account
3. WHEN a bank transaction match amount exceeds the available amount on the matched entity, THE SW_Books SHALL reject the match and suggest a partial match instead
4. THE SW_Books SHALL provide a report of all overpayment flags for finance team review
5. WHEN an overpayment is approved by a Finance_User with Approval_Authority, THE SW_Books SHALL post the payment and create a credit memo for the excess
6. THE SW_Books SHALL log all overpayment detections and resolutions to the audit log
7. WHEN a payment run includes an item with amount exceeding the vendor bill balance, THE SW_Books SHALL reject the entire payment run and return validation errors
8. THE SW_Books SHALL calculate and display the maximum allowable payment amount for each vendor bill and invoice

### Requirement 11: Edge Case Handling - Multi-Currency

**User Story:** As a finance manager, I want proper multi-currency handling with stored exchange rates, so that foreign currency transactions are accurately recorded and reported.

#### Acceptance Criteria

1. WHEN a journal entry is created in a foreign currency, THE SW_Books SHALL require an exchange rate and store it with the journal entry
2. WHEN a vendor bill is created in a foreign currency, THE SW_Books SHALL store the exchange rate and calculate the base currency equivalent
3. THE SW_Books SHALL store exchange rates with effective date, source currency, target currency, and rate value
4. WHEN a financial statement is generated, THE SW_Books SHALL convert all foreign currency amounts to the base currency using stored exchange rates
5. THE SW_Books SHALL validate that exchange rates are positive and within reasonable bounds (0.0001 to 10000)
6. WHEN a bank transaction in foreign currency is matched, THE SW_Books SHALL use the exchange rate from the transaction date
7. THE SW_Books SHALL provide an exchange rate history report showing all rates used in a period
8. WHEN an exchange rate is missing for a transaction date, THE SW_Books SHALL reject the transaction and prompt for rate entry

### Requirement 12: Edge Case Handling - Validation Rules

**User Story:** As a system administrator, I want comprehensive validation rules enforced, so that data integrity is maintained and invalid operations are prevented.

#### Acceptance Criteria

1. WHEN a Posted_Journal is edited, THE SW_Books SHALL reject the edit and return an error message stating journals are immutable after posting
2. WHEN a journal entry is reversed twice, THE SW_Books SHALL reject the second reversal and return an error message
3. WHEN a GL account is added as its own parent, THE SW_Books SHALL reject the operation and return an error message preventing circular hierarchy
4. WHEN a GL account hierarchy depth exceeds 5 levels, THE SW_Books SHALL reject the operation and return an error message
5. WHEN a journal entry is created without a fiscal period, THE SW_Books SHALL automatically assign the period based on entry date
6. WHEN a journal entry is created for a date outside any fiscal period, THE SW_Books SHALL reject the entry and prompt for fiscal period creation
7. WHEN a bank account is deleted, THE SW_Books SHALL check for unmatched transactions and block deletion if any exist
8. WHEN a GL account is archived, THE SW_Books SHALL check for non-zero balance and block archival if balance is not zero

### Requirement 13: Performance Optimization

**User Story:** As a system administrator, I want optimized database queries and caching, so that financial reports load quickly even with large datasets.

#### Acceptance Criteria

1. WHEN a trial balance is generated, THE SW_Books SHALL use a single aggregated query instead of N+1 queries per account
2. WHEN a general ledger report is requested, THE SW_Books SHALL add pagination with configurable page size (default 100 records)
3. THE SW_Books SHALL create a database index on bank_transaction.fingerprint for fast duplicate detection
4. THE SW_Books SHALL create a database index on journal_entry.entry_date for fast period-based queries
5. WHEN a financial statement is generated, THE SW_Books SHALL cache the result for 5 minutes to avoid redundant calculations
6. THE SW_Books SHALL implement a snapshot strategy for month-end reports to avoid recalculating closed periods
7. WHEN a large bank statement is imported (>1000 rows), THE SW_Books SHALL process in batches of 500 rows with progress tracking
8. THE SW_Books SHALL use database transactions for all multi-step operations to ensure atomicity and prevent partial updates

### Requirement 14: Error Handling and Messaging

**User Story:** As a user, I want clear, actionable error messages, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a validation error occurs, THE SW_Books SHALL return a structured error with field name, current value, expected format, and example
2. WHEN a journal entry fails to post, THE SW_Books SHALL return the specific reason (e.g., "Period is locked", "Account X is inactive", "Debits and credits do not balance")
3. WHEN a bank import fails, THE SW_Books SHALL return the row number, column name, invalid value, and expected format for each failed row
4. WHEN a reconciliation match fails, THE SW_Books SHALL return the specific reason (e.g., "Amount exceeds available balance by X", "Entity already fully matched")
5. THE SW_Books SHALL log all errors with full context (user ID, org ID, operation, input parameters, stack trace) for debugging
6. WHEN a payment run execution fails, THE SW_Books SHALL return which specific items failed and why, allowing partial retry
7. THE SW_Books SHALL implement retry logic with exponential backoff for transient database errors
8. WHEN a critical operation fails, THE SW_Books SHALL send a notification to the finance team with error details and suggested actions

### Requirement 15: Idempotency and Retry Safety

**User Story:** As a developer, I want idempotent operations with retry safety, so that network failures or duplicate requests do not cause data corruption.

#### Acceptance Criteria

1. WHEN a journal entry is posted twice with the same idempotency key, THE SW_Books SHALL return the existing posted journal instead of creating a duplicate
2. WHEN a vendor bill payment is recorded twice with the same idempotency key, THE SW_Books SHALL return the existing payment instead of creating a duplicate
3. WHEN a bank transaction match is confirmed twice, THE SW_Books SHALL return the existing match instead of creating a duplicate
4. THE SW_Books SHALL generate idempotency keys based on operation type, entity ID, and timestamp
5. THE SW_Books SHALL store idempotency keys with expiration (24 hours) to prevent indefinite storage growth
6. WHEN a payment run is executed twice, THE SW_Books SHALL check the run status and return the existing result if already completed
7. THE SW_Books SHALL implement optimistic locking on Accounting_Entity updates to prevent concurrent modification conflicts
8. WHEN a concurrent modification is detected, THE SW_Books SHALL return a clear error message prompting the user to refresh and retry

### Requirement 16: Audit Package Completeness

**User Story:** As an external auditor, I want a complete audit package export, so that I have all necessary financial records for audit review.

#### Acceptance Criteria

1. WHEN an audit package is exported, THE SW_Books SHALL include the complete journal register for the period
2. WHEN an audit package is exported, THE SW_Books SHALL include the trial balance with opening balances, movements, and closing balances
3. WHEN an audit package is exported, THE SW_Books SHALL include the general ledger with all line-item detail
4. WHEN an audit package is exported, THE SW_Books SHALL include an attachment index with file names, entity references, and storage keys
5. WHEN an audit package is exported, THE SW_Books SHALL include a list of all reopened periods with reopen reasons and timestamps
6. WHEN an audit package is exported, THE SW_Books SHALL include the close run summary with task statuses and blocker resolutions
7. WHEN an audit package is exported, THE SW_Books SHALL include AR aging, AP aging, GST tie-out, and TDS tie-out reports
8. THE SW_Books SHALL generate the audit package in JSON format with structured data for programmatic analysis
9. THE SW_Books SHALL include a generation timestamp, org ID, period ID, and data hash in the audit package metadata
10. WHEN an audit package is exported, THE SW_Books SHALL log the export event with user identity, period, and export timestamp

### Requirement 17: Parser and Serializer Requirements

**User Story:** As a developer, I want robust parsers and serializers for bank statements, so that imports are reliable and data integrity is maintained.

#### Acceptance Criteria

1. WHEN a bank statement CSV is uploaded, THE Bank_Statement_Parser SHALL parse it into normalized bank transaction objects
2. WHEN a bank statement row has an invalid date format, THE Bank_Statement_Parser SHALL return a descriptive error with row number and expected format
3. THE Bank_Statement_Pretty_Printer SHALL format bank transaction objects back into valid CSV files
4. FOR ALL valid bank transaction objects, parsing then printing then parsing SHALL produce an equivalent object (round-trip property)
5. WHEN a bank statement has missing required columns, THE Bank_Statement_Parser SHALL return an error listing the missing columns
6. THE Bank_Statement_Parser SHALL support multiple date formats (DMY, MDY, YMD) with configurable format hints
7. WHEN a bank statement has duplicate headers, THE Bank_Statement_Parser SHALL return an error identifying the duplicate columns
8. THE Bank_Statement_Parser SHALL normalize whitespace, currency symbols, and number formats before parsing amounts

### Requirement 18: Close Approval Workflow

**User Story:** As a finance manager, I want a multi-step close approval process, so that period close requires review and sign-off from multiple stakeholders.

#### Acceptance Criteria

1. WHEN a Fiscal_Period close is initiated, THE SW_Books SHALL create a close approval request if configured in organization settings
2. WHEN a close approval request is pending, THE SW_Books SHALL block the close completion until approved
3. THE SW_Books SHALL support configurable approval chains (e.g., Accountant → Finance Manager → CFO)
4. WHEN a close approval is rejected, THE SW_Books SHALL update the close run status to "BLOCKED" and notify the requester
5. WHEN all required approvals are granted, THE SW_Books SHALL update the close run status to "READY" and allow completion
6. THE SW_Books SHALL log all close approval decisions with approver identity, decision, timestamp, and notes
7. WHEN a close approval is requested, THE SW_Books SHALL send notifications to all required approvers
8. THE SW_Books SHALL display the approval chain status on the close workspace showing pending, approved, and rejected steps

### Requirement 19: Reconciliation Confidence Scoring

**User Story:** As an accountant, I want confidence scores on reconciliation suggestions, so that I can prioritize high-confidence matches and review low-confidence matches carefully.

#### Acceptance Criteria

1. WHEN a reconciliation suggestion is generated, THE Reconciliation_Engine SHALL calculate a Match_Confidence score from 0 to 100
2. THE Reconciliation_Engine SHALL award 55 points for exact amount match within tolerance
3. THE Reconciliation_Engine SHALL award 20 points for transaction date within 1 day
4. THE Reconciliation_Engine SHALL award 15 points for reference number or description text match
5. THE Reconciliation_Engine SHALL award 10 points for entity type match (e.g., gateway settlement)
6. WHEN a Match_Confidence score is below 50, THE SW_Books SHALL mark the suggestion as "low confidence" and require manual review
7. WHEN a Match_Confidence score is above 90, THE SW_Books SHALL mark the suggestion as "high confidence" and allow auto-match if configured
8. THE SW_Books SHALL display confidence scores in the reconciliation workspace with color coding (green >80, yellow 50-80, red <50)

### Requirement 20: Financial Statement Snapshots

**User Story:** As a finance manager, I want financial statement snapshots with retention, so that I can compare historical reports and meet regulatory retention requirements.

#### Acceptance Criteria

1. WHEN a financial statement is generated, THE SW_Books SHALL create a snapshot with statement type, period, generation timestamp, and data hash
2. THE SW_Books SHALL store snapshots in a separate table with immutable records
3. WHEN a snapshot is created, THE SW_Books SHALL calculate a SHA-256 hash of the statement data for integrity verification
4. THE SW_Books SHALL implement a retention policy retaining snapshots for 7 years from the period end date
5. WHEN a snapshot is older than the retention period, THE SW_Books SHALL archive it to cold storage or delete it based on configuration
6. THE SW_Books SHALL provide a snapshot comparison view showing current vs. prior snapshot with variance highlighting
7. WHEN a snapshot is requested, THE SW_Books SHALL verify the data hash matches the stored hash before returning the data
8. THE SW_Books SHALL log all snapshot creation and retrieval events to the audit log

