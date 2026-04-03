"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { normalizeInvoice } from "@/features/invoice/utils/normalize-invoice";
import type { InvoiceFormValues } from "@/features/invoice/types";
import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import {
  InlineDateField,
  InlineNumberField,
  InlineTextArea,
  InlineTextField,
} from "@/components/document/inline-edit-fields";
import { cn } from "@/lib/utils";

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-500"
      aria-label="Remove row"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--accent)] transition-opacity hover:opacity-75"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      {label}
    </button>
  );
}

const colClass = "px-2 py-1.5 text-sm";
const thClass = cn(colClass, "text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]");

export function InvoiceDocumentEditor() {
  const { control } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  const watchedValues = useWatch({ control }) as InvoiceFormValues;
  const doc = normalizeInvoice(watchedValues);

  const branding = doc.branding;

  return (
    <div className="mx-auto w-full max-w-[794px]">
      <div className="rounded-2xl border border-[var(--border-strong)] bg-white shadow-[var(--shadow-card)]" style={{ minHeight: 1122 }}>
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
                <InlineTextField
                  name="businessTaxId"
                  placeholder="GSTIN"
                  className="mt-0.5 text-sm text-[var(--foreground-soft)]"
                />
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold tracking-wide text-[var(--foreground)]">TAX INVOICE</p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[var(--muted-foreground)]">Invoice #</span>
                  <InlineTextField name="invoiceNumber" placeholder="INV-001" className="w-28 text-right font-medium" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[var(--muted-foreground)]">Date</span>
                  <InlineDateField name="invoiceDate" className="w-36 text-right" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[var(--muted-foreground)]">Due Date</span>
                  <InlineDateField name="dueDate" className="w-36 text-right" />
                </div>
              </div>
            </div>
          </div>

          {/* Bill To + Place of Supply */}
          <div className="mt-8 flex gap-8">
            <div className="flex-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Bill To</p>
              <InlineTextField name="clientName" placeholder="Client / Company Name" className="mt-1 font-medium" />
              <InlineTextField name="clientTaxId" placeholder="Client GSTIN" className="mt-0.5 text-sm text-[var(--foreground-soft)]" />
              <InlineTextArea name="clientAddress" placeholder="Client address" className="mt-0.5 text-sm text-[var(--foreground-soft)]" />
              <InlineTextField name="clientEmail" placeholder="Client email" className="mt-0.5 text-sm text-[var(--foreground-soft)]" />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Place of Supply</p>
              <InlineTextField name="placeOfSupply" placeholder="State" className="mt-1 text-sm font-medium" />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-8">
            <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                    <th className={cn(thClass, "w-[36%]")}>Description</th>
                    <th className={cn(thClass, "w-14 text-right")}>Qty</th>
                    <th className={cn(thClass, "w-20 text-right")}>Rate</th>
                    <th className={cn(thClass, "w-16 text-right")}>Tax %</th>
                    <th className={cn(thClass, "w-20 text-right")}>Discount</th>
                    <th className={cn(thClass, "w-24 text-right")}>Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const item = doc.lineItems[index];
                    return (
                      <tr key={field.id} className="border-b border-[var(--border-soft)] last:border-0">
                        <td className={colClass}>
                          <InlineTextField name={`lineItems.${index}.description`} placeholder="Item description" />
                        </td>
                        <td className={cn(colClass, "text-right")}>
                          <InlineNumberField name={`lineItems.${index}.quantity`} placeholder="1" className="text-right" />
                        </td>
                        <td className={cn(colClass, "text-right")}>
                          <InlineNumberField name={`lineItems.${index}.unitPrice`} placeholder="0.00" className="text-right" />
                        </td>
                        <td className={cn(colClass, "text-right")}>
                          <InlineNumberField name={`lineItems.${index}.taxRate`} placeholder="18" className="text-right" />
                        </td>
                        <td className={cn(colClass, "text-right")}>
                          <InlineNumberField name={`lineItems.${index}.discountAmount`} placeholder="0" className="text-right" />
                        </td>
                        <td className={cn(colClass, "text-right font-medium tabular-nums")}>
                          {item?.lineTotalFormatted ?? "—"}
                        </td>
                        <td className="pr-2 text-center">
                          {fields.length > 1 && (
                            <RemoveRowButton onClick={() => remove(index)} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AddRowButton
              label="Add line item"
              onClick={() => append({ description: "", quantity: "1", unitPrice: "", taxRate: "18", discountAmount: "0" })}
            />
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--foreground-soft)]">Subtotal</span>
                <span className="tabular-nums font-medium">{doc.subtotalFormatted}</span>
              </div>
              {doc.totalTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--foreground-soft)]">Tax</span>
                  <span className="tabular-nums">{doc.totalTaxFormatted}</span>
                </div>
              )}
              {doc.totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--foreground-soft)]">Discount</span>
                  <span className="tabular-nums">−{doc.totalDiscountFormatted}</span>
                </div>
              )}
              {doc.extraCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--foreground-soft)]">Extra Charges</span>
                  <span className="tabular-nums">{doc.extraChargesFormatted}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--border-soft)] pt-2 text-base font-semibold">
                <span>Grand Total</span>
                <span className="tabular-nums">{doc.grandTotalFormatted}</span>
              </div>
              {doc.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-soft)]">Amount Paid</span>
                    <span className="tabular-nums">{doc.amountPaidFormatted}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-[var(--accent)]">
                    <span>Balance Due</span>
                    <span className="tabular-nums">{doc.balanceDueFormatted}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes + Terms */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Notes</p>
              <InlineTextArea name="notes" placeholder="Notes to client…" className="mt-1 text-sm" />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Terms & Conditions</p>
              <InlineTextArea name="terms" placeholder="Terms and conditions…" className="mt-1 text-sm" />
            </div>
          </div>

          {/* Bank Details */}
          <div className="mt-6 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Bank Details</p>
            <div className="mt-2 grid gap-y-1 sm:grid-cols-3">
              <div>
                <span className="text-xs text-[var(--muted-foreground)]">Bank</span>
                <InlineTextField name="bankName" placeholder="Bank name" className="text-sm" />
              </div>
              <div>
                <span className="text-xs text-[var(--muted-foreground)]">Account No.</span>
                <InlineTextField name="bankAccountNumber" placeholder="Account number" className="text-sm" />
              </div>
              <div>
                <span className="text-xs text-[var(--muted-foreground)]">IFSC</span>
                <InlineTextField name="bankIfsc" placeholder="IFSC code" className="text-sm" />
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-6 flex justify-end">
            <div className="w-48 text-center">
              <div className="h-12 border-b border-[var(--border-soft)]" />
              <InlineTextField name="authorizedBy" placeholder="Authorized By" className="mt-1 text-center text-xs text-[var(--muted-foreground)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
