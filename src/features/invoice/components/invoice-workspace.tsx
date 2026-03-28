"use client";

import Link from "next/link";
import { useState } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldShell } from "@/components/forms/field-shell";
import { FormSection } from "@/components/forms/form-section";
import {
  ColorField,
  FileUploadField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/forms/input-primitives";
import { RepeaterSection } from "@/components/forms/repeater-section";
import { InvoicePreview } from "@/features/invoice/components/invoice-preview";
import { invoiceDefaultValues, invoiceTemplateOptions } from "@/features/invoice/constants";
import { invoiceFormSchema } from "@/features/invoice/schema";
import type { InvoiceFormValues } from "@/features/invoice/types";
import { buildInvoiceFilename } from "@/features/invoice/utils/build-invoice-filename";
import { normalizeInvoice } from "@/features/invoice/utils/normalize-invoice";
import { cn } from "@/lib/utils";

type InvoiceActionState =
  | { status: "idle" }
  | { status: "pending"; action: "print" | "pdf" | "png" }
  | { status: "error"; message: string };

async function parseExportError(response: Response, format: "pdf" | "png") {
  try {
    const payload = (await response.json()) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Ignore JSON parsing problems and fall back to the generic message below.
  }

  return `Unable to export the invoice as ${format.toUpperCase()}.`;
}

function rowInputClass() {
  return cn(
    "w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_12px_30px_rgba(38,30,20,0.04)] outline-none transition-colors focus:border-[var(--accent)]",
  );
}

function InvoiceLineItemsEditor() {
  const { control, register } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  return (
    <RepeaterSection
      title="Line items"
      description="Each row computes its base, discount, tax, and line total in the live preview."
      actionLabel="Add line item"
      onAdd={() =>
        append({
          description: "",
          quantity: "1",
          unitPrice: "",
          taxRate: "18",
          discountAmount: "0",
        })
      }
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="Description" htmlFor={`lineItems-${index}-description`}>
              <input
                id={`lineItems-${index}-description`}
                {...register(`lineItems.${index}.description` as const)}
                className={rowInputClass()}
                placeholder="HR outsourcing retainer"
              />
            </FieldShell>
            <FieldShell label="Quantity" htmlFor={`lineItems-${index}-quantity`}>
              <input
                id={`lineItems-${index}-quantity`}
                type="number"
                {...register(`lineItems.${index}.quantity` as const)}
                className={rowInputClass()}
                placeholder="1"
              />
            </FieldShell>
            <FieldShell label="Unit price" htmlFor={`lineItems-${index}-unitPrice`}>
              <input
                id={`lineItems-${index}-unitPrice`}
                type="number"
                {...register(`lineItems.${index}.unitPrice` as const)}
                className={rowInputClass()}
                placeholder="32000"
              />
            </FieldShell>
            <FieldShell label="Tax rate (%)" htmlFor={`lineItems-${index}-taxRate`}>
              <input
                id={`lineItems-${index}-taxRate`}
                type="number"
                {...register(`lineItems.${index}.taxRate` as const)}
                className={rowInputClass()}
                placeholder="18"
              />
            </FieldShell>
            <FieldShell label="Discount amount" htmlFor={`lineItems-${index}-discountAmount`}>
              <input
                id={`lineItems-${index}-discountAmount`}
                type="number"
                {...register(`lineItems.${index}.discountAmount` as const)}
                className={rowInputClass()}
                placeholder="0"
              />
            </FieldShell>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="inline-flex h-[3rem] items-center justify-center rounded-full border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </RepeaterSection>
  );
}

function InvoicePanel() {
  const { control, getValues, setValue, trigger } = useFormContextSafe();
  const values = useWatch({ control }) as InvoiceFormValues;
  const [selectedTemplateId, setSelectedTemplateId] = useState(values.templateId);
  const previewDocument = normalizeInvoice({
    ...values,
    templateId: selectedTemplateId,
  });
  const [actionState, setActionState] = useState<InvoiceActionState>({
    status: "idle",
  });

  async function prepareDocument() {
    const isValid = await trigger();

    if (!isValid) {
      setActionState({
        status: "error",
        message: "Complete the required invoice fields before exporting.",
      });
      return null;
    }

    return normalizeInvoice({
      ...getValues(),
      templateId: selectedTemplateId,
    });
  }

  async function handleDownload(format: "pdf" | "png") {
    const document = await prepareDocument();

    if (!document) {
      return;
    }

    setActionState({ status: "pending", action: format });

    try {
      const response = await fetch(`/api/export/invoice/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document }),
      });

      if (!response.ok) {
        throw new Error(await parseExportError(response, format));
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = buildInvoiceFilename(document, format);
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setActionState({ status: "idle" });
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : `Unable to export the invoice as ${format.toUpperCase()}.`,
      });
    }
  }

  async function handlePrint() {
    const document = await prepareDocument();

    if (!document) {
      return;
    }

    const printWindow = window.open(
      "about:blank",
      "_blank",
      "popup=yes,width=1060,height=1320",
    );

    if (!printWindow) {
      setActionState({
        status: "error",
        message: "Allow popups to open the invoice print surface.",
      });
      return;
    }

    setActionState({ status: "pending", action: "print" });

    try {
      const response = await fetch("/api/export/invoice/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document }),
      });

      if (!response.ok) {
        throw new Error("Unable to prepare the invoice print surface.");
      }

      const payload = (await response.json()) as { printUrl?: string };

      if (!payload.printUrl) {
        throw new Error("Unable to prepare the invoice print surface.");
      }

      printWindow.location.href = payload.printUrl;
      setActionState({ status: "idle" });
    } catch (error) {
      printWindow.close();
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to prepare the invoice print surface.",
      });
    }
  }

  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(198,152,84,0.16),transparent_38%)]" />
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)] lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              Invoice workspace
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-[var(--foreground)] md:text-5xl">
              Invoice Generator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
              Build client-ready invoices with branded headers, tax-aware line items,
              clear totals, and a live A4 preview ready for the export phase.
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
              onClick={handlePrint}
              disabled={actionState.status === "pending"}
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-65"
            >
              {actionState.status === "pending" && actionState.action === "print"
                ? "Preparing print"
                : "Print invoice"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("pdf")}
              disabled={actionState.status === "pending"}
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--foreground-soft)] disabled:cursor-wait disabled:opacity-65"
            >
              {actionState.status === "pending" && actionState.action === "pdf"
                ? "Exporting PDF"
                : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("png")}
              disabled={actionState.status === "pending"}
              className="inline-flex items-center justify-center rounded-full bg-[rgba(29,23,16,0.12)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition-colors hover:bg-[rgba(29,23,16,0.18)] disabled:cursor-wait disabled:opacity-65"
            >
              {actionState.status === "pending" && actionState.action === "png"
                ? "Exporting PNG"
                : "Export PNG"}
            </button>
          </div>
        </div>

        {actionState.status === "error" ? (
          <div className="rounded-[1.5rem] border border-[rgba(178,85,54,0.2)] bg-[rgba(178,85,54,0.08)] px-5 py-4 text-sm text-[var(--danger)]">
            {actionState.message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(23rem,29rem)_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Invoice controls
                </p>
                <h2 className="mt-3 text-2xl text-[var(--foreground)]">
                  Client-facing billing builder
                </h2>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                Export ready
              </span>
            </div>

            <div className="space-y-4">
              <FormSection
                eyebrow="Template"
                title="Template and branding"
                description="Switch invoice layouts without resetting the form or recalculating totals incorrectly."
              >
                <FieldShell label="Invoice template">
                  <div className="grid gap-3">
                    {invoiceTemplateOptions.map((template) => {
                      const active = template.id === selectedTemplateId;

                      return (
                        <button
                          key={template.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setValue("templateId", template.id, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                          }}
                          className={cn(
                            "rounded-[1rem] border px-4 py-3 text-left shadow-[0_12px_30px_rgba(38,30,20,0.04)] transition-colors",
                            active
                              ? "border-[var(--accent)] bg-white"
                              : "border-[var(--border-soft)] bg-white/80 hover:bg-white",
                          )}
                        >
                          <span className="block text-sm font-medium text-[var(--foreground)]">
                            {template.name}
                          </span>
                          <span className="mt-1 block text-xs leading-6 text-[var(--muted-foreground)]">
                            {template.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FieldShell>
                <TextField<InvoiceFormValues>
                  name="branding.companyName"
                  label="Business name"
                  placeholder="Northfield Trading Co."
                />
                <TextAreaField<InvoiceFormValues>
                  name="branding.address"
                  label="Business address"
                  rows={3}
                  placeholder="18 Market Road, Kozhikode"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="branding.email"
                    label="Business email"
                    placeholder="accounts@example.com"
                  />
                  <TextField<InvoiceFormValues>
                    name="branding.phone"
                    label="Business phone"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="website"
                    label="Website"
                    placeholder="www.northfield.example"
                  />
                  <TextField<InvoiceFormValues>
                    name="businessTaxId"
                    label="Tax ID / GSTIN"
                    placeholder="GSTIN 32ABCDE1234F1Z6"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ColorField<InvoiceFormValues>
                    name="branding.accentColor"
                    label="Accent color"
                  />
                  <FileUploadField<InvoiceFormValues>
                    name="branding.logoDataUrl"
                    label="Logo upload"
                    hint="Session-only asset for the live preview."
                  />
                </div>
              </FormSection>

              <FormSection
                eyebrow="Client"
                title="Client details"
                description="Control how the client block appears in the invoice preview."
              >
                <TextField<InvoiceFormValues>
                  name="clientName"
                  label="Client name"
                  required
                  placeholder="Axis PeopleX Pvt. Ltd."
                />
                <TextAreaField<InvoiceFormValues>
                  name="clientAddress"
                  label="Client address"
                  rows={3}
                  placeholder="4th Floor, Grand Square, Kochi"
                />
                <TextAreaField<InvoiceFormValues>
                  name="shippingAddress"
                  label="Shipping address"
                  rows={3}
                  placeholder="Warehouse Bay 3, Marine Drive, Kochi"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="clientEmail"
                    label="Client email"
                    placeholder="finance@example.com"
                  />
                  <TextField<InvoiceFormValues>
                    name="clientPhone"
                    label="Client phone"
                    placeholder="+91 98470 12000"
                  />
                </div>
                <TextField<InvoiceFormValues>
                  name="clientTaxId"
                  label="Client tax ID / GSTIN"
                  placeholder="GSTIN 32AAACA1122R1ZV"
                />
              </FormSection>

              <FormSection
                eyebrow="Meta"
                title="Invoice metadata"
                description="Dates and payment tracking stay separate from the line-item math."
              >
                <TextField<InvoiceFormValues>
                  name="invoiceNumber"
                  label="Invoice number"
                  required
                  placeholder="INV-2026-031"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="invoiceDate"
                    label="Invoice date"
                    required
                    type="date"
                  />
                  <TextField<InvoiceFormValues>
                    name="dueDate"
                    label="Due date"
                    type="date"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="placeOfSupply"
                    label="Place of supply"
                    placeholder="Kerala"
                  />
                  <TextField<InvoiceFormValues>
                    name="amountPaid"
                    label="Amount paid"
                    type="number"
                    placeholder="15000"
                  />
                </div>
              </FormSection>

              <FormSection
                eyebrow="Billing"
                title="Line items and totals"
                description="Each line supports quantity, discount, and tax without leaving the form."
              >
                <InvoiceLineItemsEditor />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="extraCharges"
                    label="Extra charges"
                    type="number"
                    placeholder="1500"
                  />
                  <TextField<InvoiceFormValues>
                    name="invoiceLevelDiscount"
                    label="Invoice-level discount"
                    type="number"
                    placeholder="500"
                  />
                </div>
              </FormSection>

              <FormSection
                eyebrow="Footer"
                title="Notes, terms, bank details, and signature"
                description="Optional payment and approval information stays grouped here."
              >
                <TextAreaField<InvoiceFormValues>
                  name="notes"
                  label="Notes"
                  rows={3}
                  placeholder="Thank you for the continued engagement."
                />
                <TextAreaField<InvoiceFormValues>
                  name="terms"
                  label="Terms"
                  rows={3}
                  placeholder="Payment due within 7 days."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="bankName"
                    label="Bank name"
                    placeholder="Federal Bank"
                  />
                  <TextField<InvoiceFormValues>
                    name="bankAccountNumber"
                    label="Account number"
                    placeholder="122001004281"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<InvoiceFormValues>
                    name="bankIfsc"
                    label="IFSC"
                    placeholder="FDRL0001220"
                  />
                  <TextField<InvoiceFormValues>
                    name="authorizedBy"
                    label="Authorized by"
                    placeholder="Anita Thomas"
                  />
                </div>
              </FormSection>

              <FormSection
                eyebrow="Visibility"
                title="Optional sections"
                description="Hide optional business, client, and footer blocks without affecting totals."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showAddress"
                    label="Business address"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showEmail"
                    label="Business email"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showPhone"
                    label="Business phone"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showWebsite"
                    label="Business website"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showBusinessTaxId"
                    label="Business tax ID"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showClientAddress"
                    label="Client address"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showClientEmail"
                    label="Client email"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showClientPhone"
                    label="Client phone"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showClientTaxId"
                    label="Client tax ID"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showShippingAddress"
                    label="Shipping address"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showDueDate"
                    label="Due date"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showPlaceOfSupply"
                    label="Place of supply"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showNotes"
                    label="Notes"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showTerms"
                    label="Terms"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showBankDetails"
                    label="Bank details"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showSignature"
                    label="Signature"
                  />
                  <ToggleField<InvoiceFormValues>
                    name="visibility.showPaymentSummary"
                    label="Payment summary"
                  />
                </div>
              </FormSection>
            </div>
          </section>

          <section>
            <InvoicePreview document={previewDocument} />
          </section>
        </div>
      </div>
    </main>
  );
}

function useFormContextSafe() {
  return useFormContext<InvoiceFormValues>();
}

export function InvoiceWorkspace() {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoiceDefaultValues,
    mode: "onChange",
  });

  return (
    <FormProvider {...form}>
      <InvoicePanel />
    </FormProvider>
  );
}
