## Summary

Fixes critical payment run rejection handling bug (SEC-003). Payment runs now properly track rejection state and prevent execution after rejection.

## Changes

### Backend
- Added `REJECTED` status to `PaymentRunStatus` enum
- Added rejection fields to `PaymentRun` model (rejectedAt, rejectedByUserId, rejectionReason)
- Implemented `rejectPaymentRun()` and `resubmitPaymentRun()` functions
- Updated approval rejection handler to use REJECTED status

### Frontend
- Added rejection reason display in payment run detail
- Added "Resubmit for Approval" button for rejected runs

### Tests
- Added comprehensive test coverage for rejection flow

## Migration Required

```bash
npx prisma migrate dev --name payment_run_rejection
npx prisma generate
```

## Files Changed
- `prisma/schema.prisma`
- `src/lib/accounting/vendor-bills.ts`
- `src/app/app/flow/approvals/actions.ts`
- `src/app/app/books/actions.ts`
- `src/app/app/books/components/payment-run-detail-actions.tsx`
- `src/lib/accounting/__tests__/payment-run-rejection.test.ts` (new)

## Testing

```bash
npm test
npm run build
```

## Before/After

**Before:** Payment run rejection rolled back to DRAFT, losing rejection info. Rejected runs could still execute.

**After:** Payment runs track rejection state with reason. Clean resubmission workflow. Cannot execute rejected runs.

## Closes

- SEC-003 (P0 critical security issue)
