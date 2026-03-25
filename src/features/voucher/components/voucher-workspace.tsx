"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormSection } from "@/components/forms/form-section";
import {
  ColorField,
  FileUploadField,
  SelectField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/forms/input-primitives";
import {
  voucherDefaultValues,
  voucherTemplateOptions,
} from "@/features/voucher/constants";
import { VoucherPreview } from "@/features/voucher/components/voucher-preview";
import { voucherFormSchema } from "@/features/voucher/schema";
import type { VoucherFormValues } from "@/features/voucher/types";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";

function VoucherPanel() {
  const { control } = useFormContextSafe();
  const values = useWatch({ control }) as VoucherFormValues;
  const visibility = values.visibility;
  const isPayment = values.voucherType === "payment";
  const previewDocument = useMemo(() => normalizeVoucher(values), [values]);

  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(198,152,84,0.16),transparent_38%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)] lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              Voucher workspace
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-[var(--foreground)] md:text-5xl">
              Voucher Generator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
              Create payment and receipt vouchers with brand controls, field visibility,
              and a live A4 preview. Export actions are reserved for the next phase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Back to home
            </Link>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-[rgba(29,23,16,0.12)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)]"
            >
              Export next phase
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(24rem,31rem)_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Voucher controls
                </p>
                <h2 className="mt-3 text-2xl text-[var(--foreground)]">
                  Real-time document builder
                </h2>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                Phase 2
              </span>
            </div>

            <div className="space-y-4">
              <FormSection
                eyebrow="Template"
                title="Template and voucher mode"
                description="Switch layouts or voucher type without losing the entered form state."
              >
                <SelectField<VoucherFormValues>
                  name="templateId"
                  label="Voucher template"
                  options={voucherTemplateOptions.map((template) => ({
                    value: template.id,
                    label: template.name,
                  }))}
                />
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  {
                    voucherTemplateOptions.find(
                      (template) => template.id === values.templateId,
                    )?.description
                  }
                </div>
                <SelectField<VoucherFormValues>
                  name="voucherType"
                  label="Voucher type"
                  required
                  options={[
                    { value: "payment", label: "Payment voucher" },
                    { value: "receipt", label: "Receipt voucher" },
                  ]}
                />
              </FormSection>

              <FormSection
                eyebrow="Branding"
                title="Business identity"
                description="Logo and accent color apply instantly to the live preview."
              >
                <TextField<VoucherFormValues>
                  name="branding.companyName"
                  label="Company name"
                  placeholder="Northfield Trading Co."
                />
                <TextAreaField<VoucherFormValues>
                  name="branding.address"
                  label="Address"
                  rows={3}
                  placeholder="18 Market Road, Kozhikode"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<VoucherFormValues>
                    name="branding.email"
                    label="Email"
                    placeholder="accounts@example.com"
                  />
                  <TextField<VoucherFormValues>
                    name="branding.phone"
                    label="Phone"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ColorField<VoucherFormValues>
                    name="branding.accentColor"
                    label="Accent color"
                  />
                  <FileUploadField<VoucherFormValues>
                    name="branding.logoDataUrl"
                    label="Logo upload"
                    hint="Session-only asset for the preview."
                  />
                </div>
              </FormSection>

              <FormSection
                eyebrow="Voucher details"
                title="Core voucher information"
                description="These fields drive the document content and validation."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<VoucherFormValues>
                    name="voucherNumber"
                    label="Voucher number"
                    required
                  />
                  <TextField<VoucherFormValues>
                    name="date"
                    label="Date"
                    required
                    type="date"
                  />
                </div>
                <TextField<VoucherFormValues>
                  name="counterpartyName"
                  label={isPayment ? "Paid to" : "Received from"}
                  required
                  placeholder={isPayment ? "Rahul Menon" : "Priya Nair"}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<VoucherFormValues>
                    name="amount"
                    label="Amount"
                    required
                    type="number"
                    placeholder="1850"
                  />
                  {visibility.showPaymentMode ? (
                    <TextField<VoucherFormValues>
                      name="paymentMode"
                      label="Payment mode"
                      placeholder="Cash / Bank transfer"
                    />
                  ) : null}
                </div>
                {visibility.showReferenceNumber ? (
                  <TextField<VoucherFormValues>
                    name="referenceNumber"
                    label="Reference number"
                    placeholder="REF-8831"
                  />
                ) : null}
                <TextAreaField<VoucherFormValues>
                  name="purpose"
                  label="Purpose / narration"
                  required
                  rows={4}
                  placeholder="Travel reimbursement for site visit."
                />
                {visibility.showNotes ? (
                  <TextAreaField<VoucherFormValues>
                    name="notes"
                    label="Notes / remarks"
                    rows={3}
                    placeholder="Settled after manager approval."
                  />
                ) : null}
              </FormSection>

              <FormSection
                eyebrow="Approvals"
                title="Signature and authorization"
                description="Only the enabled blocks appear in the preview."
              >
                {visibility.showApprovedBy ? (
                  <TextField<VoucherFormValues>
                    name="approvedBy"
                    label="Approved by"
                    placeholder="Anita Thomas"
                  />
                ) : null}
                {visibility.showReceivedBy ? (
                  <TextField<VoucherFormValues>
                    name="receivedBy"
                    label="Received by"
                    placeholder="Rahul Menon"
                  />
                ) : null}
              </FormSection>

              <FormSection
                eyebrow="Visibility"
                title="Show or hide optional fields"
                description="These toggles immediately rebalance the preview layout."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleField<VoucherFormValues>
                    name="visibility.showAddress"
                    label="Address"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showEmail"
                    label="Email"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showPhone"
                    label="Phone"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showPaymentMode"
                    label="Payment mode"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showReferenceNumber"
                    label="Reference number"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showNotes"
                    label="Notes"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showApprovedBy"
                    label="Approved by"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showReceivedBy"
                    label="Received by"
                  />
                  <ToggleField<VoucherFormValues>
                    name="visibility.showSignatureArea"
                    label="Signature area"
                  />
                </div>
              </FormSection>
            </div>
          </section>

          <section>
            <VoucherPreview document={previewDocument} />
          </section>
        </div>
      </div>
    </main>
  );
}

function useFormContextSafe() {
  return useFormContext<VoucherFormValues>();
}

export function VoucherWorkspace() {
  const methods = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: voucherDefaultValues,
    mode: "onChange",
  });

  return (
    <FormProvider {...methods}>
      <VoucherPanel />
    </FormProvider>
  );
}
