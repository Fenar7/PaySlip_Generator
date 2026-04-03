"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";
import type { VoucherFormValues } from "@/features/voucher/types";
import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import {
  InlineDateField,
  InlineNumberField,
  InlineSelectField,
  InlineTextArea,
  InlineTextField,
} from "@/components/document/inline-edit-fields";

const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "Select mode" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "IMPS", label: "IMPS" },
  { value: "UPI", label: "UPI" },
  { value: "Bank Transfer", label: "Bank Transfer" },
];

export function VoucherDocumentEditor() {
  const { control } = useFormContext<VoucherFormValues>();
  const watchedValues = useWatch({ control }) as VoucherFormValues;
  const doc = normalizeVoucher(watchedValues);

  const branding = doc.branding;
  const isPayment = doc.voucherType === "payment";

  return (
    <div className="mx-auto w-full max-w-[794px]">
      <div className="rounded-2xl border border-[var(--border-strong)] bg-white shadow-[var(--shadow-card)]" style={{ minHeight: 700 }}>
        {/* Accent stripe */}
        <div className="h-2 w-full rounded-t-2xl" style={{ background: branding.accentColor || "var(--accent)" }} />

        <div className="p-10 pt-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <DocumentBrandMark
                branding={branding}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)]"
                initialsClassName="text-base font-semibold text-[var(--foreground)]"
              />
              <div className="min-w-0 flex-1">
                <InlineTextField
                  name="branding.companyName"
                  placeholder="Company Name"
                  className="text-lg font-semibold text-[var(--foreground)]"
                />
                <InlineTextArea
                  name="branding.address"
                  placeholder="Company address"
                  className="mt-0.5 text-sm text-[var(--foreground-soft)]"
                />
                <InlineTextField
                  name="branding.email"
                  placeholder="Email"
                  className="mt-0.5 text-sm text-[var(--foreground-soft)]"
                />
                <InlineTextField
                  name="branding.phone"
                  placeholder="Phone"
                  className="mt-0.5 text-sm text-[var(--foreground-soft)]"
                />
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold uppercase tracking-wide text-[var(--foreground)]">
                {isPayment ? "Payment Voucher" : "Receipt Voucher"}
              </p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[var(--muted-foreground)]">Voucher #</span>
                  <InlineTextField name="voucherNumber" placeholder="VCH-001" className="w-28 text-right font-medium" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[var(--muted-foreground)]">Date</span>
                  <InlineDateField name="date" className="w-36 text-right" />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-[var(--border-soft)]" />

          {/* Core fields */}
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {isPayment ? "Paid To" : "Received From"}
                </p>
                <InlineTextField
                  name="counterpartyName"
                  placeholder={isPayment ? "Payee name" : "Payer name"}
                  className="mt-1 text-base font-medium"
                />
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Amount (₹)</p>
                <InlineNumberField name="amount" placeholder="0.00" className="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)]" />
                <p className="mt-0.5 text-xs italic text-[var(--muted-foreground)]">{doc.amountInWords || "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Purpose / Description</p>
              <InlineTextArea name="purpose" placeholder="Purpose of payment…" className="mt-1 text-sm" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Payment Mode</p>
                <InlineSelectField name="paymentMode" options={PAYMENT_MODE_OPTIONS} className="mt-1 text-sm" />
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Reference / Cheque #</p>
                <InlineTextField name="referenceNumber" placeholder="Reference number" className="mt-1 text-sm" />
              </div>
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Notes</p>
              <InlineTextArea name="notes" placeholder="Additional notes…" className="mt-1 text-sm" />
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-[var(--border-soft)]" />

          {/* Approvals */}
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Prepared By</p>
              <div className="mt-8 border-b border-[var(--border-soft)]" />
              <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">Signature</p>
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Approved By</p>
              <InlineTextField name="approvedBy" placeholder="Name" className="mt-1 text-sm" />
              <div className="mt-4 border-b border-[var(--border-soft)]" />
              <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">Signature</p>
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {isPayment ? "Received By" : "Authorized By"}
              </p>
              <InlineTextField name="receivedBy" placeholder="Name" className="mt-1 text-sm" />
              <div className="mt-4 border-b border-[var(--border-soft)]" />
              <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
