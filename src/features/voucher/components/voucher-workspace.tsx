"use client";

import { useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldShell } from "@/components/forms/field-shell";
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
  DocumentWorkspaceLayout,
  type WorkspaceExportDialog,
  type WorkspaceAction,
  type WorkspaceSectionMeta,
} from "@/components/foundation/document-workspace-layout";
import {
  voucherDefaultValues,
  voucherTemplateOptions,
} from "@/features/voucher/constants";
import { VoucherPreview } from "@/features/voucher/components/voucher-preview";
import { voucherFormSchema } from "@/features/voucher/schema";
import type { VoucherFormValues } from "@/features/voucher/types";
import { buildVoucherFilename } from "@/features/voucher/utils/build-voucher-filename";
import { normalizeVoucher } from "@/features/voucher/utils/normalize-voucher";
import { downloadBinaryExport } from "@/lib/browser/download-binary-export";
import { cn } from "@/lib/utils";

type VoucherActionState =
  | { status: "idle" }
  | { status: "pending"; action: "print" | "pdf" | "png" }
  | { status: "success"; action: "pdf" | "png" }
  | { status: "error"; action?: "pdf" | "png"; message: string };

const voucherWorkspaceSections: WorkspaceSectionMeta[] = [
  { id: "voucher-setup", label: "Setup" },
  { id: "voucher-branding", label: "Brand" },
  { id: "voucher-details", label: "Details" },
  { id: "voucher-approvals", label: "Approvals" },
  { id: "voucher-visibility", label: "Visibility" },
];

function VoucherPanel() {
  const { control, getValues, setValue, trigger } = useFormContextSafe();
  const values = useWatch({ control }) as VoucherFormValues;
  const isPayment = values.voucherType === "payment";
  const [selectedTemplateId, setSelectedTemplateId] = useState(values.templateId);
  const visibility = values.visibility;
  const previewDocument = normalizeVoucher({
    ...values,
    templateId: selectedTemplateId,
  });
  const [actionState, setActionState] = useState<VoucherActionState>({
    status: "idle",
  });

  async function prepareDocument() {
    const isValid = await trigger();

    if (!isValid) {
      setActionState({
        status: "error",
        message: "Complete the required voucher fields before exporting.",
      });
      return null;
    }

    return normalizeVoucher({
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
      const endpoint = format === "pdf" ? "/api/export/pdf" : "/api/export/png";
      const payload = JSON.stringify({ document });
      await downloadBinaryExport({
        endpoint,
        payload,
        fallbackFilename: buildVoucherFilename(document, format),
      });
      setActionState({ status: "success", action: format });
    } catch (error) {
      setActionState({
        status: "error",
        action: format,
        message:
          error instanceof Error
            ? error.message
            : `Unable to export the voucher as ${format.toUpperCase()}.`,
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
        message: "Allow popups to open the voucher print surface.",
      });
      return;
    }

    setActionState({ status: "pending", action: "print" });

    try {
      const response = await fetch("/api/export/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document }),
      });

      if (!response.ok) {
        throw new Error("Unable to prepare the voucher print surface.");
      }

      const payload = (await response.json()) as { printUrl?: string };

      if (!payload.printUrl) {
        throw new Error("Unable to prepare the voucher print surface.");
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
            : "Unable to prepare the voucher print surface.",
      });
    }
  }

  return (
    <DocumentWorkspaceLayout
      eyebrow="Voucher workspace"
      title="Voucher Generator"
      description="Create payment and receipt vouchers in a cleaner workspace with live preview, structured input, and export actions that stay close to the document."
      actions={[
        { id: "home", label: "Back to home", href: "/", variant: "secondary" },
        {
          id: "print",
          label:
            actionState.status === "pending" && actionState.action === "print"
              ? "Preparing print"
              : "Print voucher",
          onClick: handlePrint,
          disabled: actionState.status === "pending",
          variant: "secondary",
        },
        {
          id: "pdf",
          label:
            actionState.status === "pending" && actionState.action === "pdf"
              ? "Exporting PDF"
              : "Export PDF",
          onClick: () => handleDownload("pdf"),
          disabled: actionState.status === "pending",
          variant: "primary",
        },
        {
          id: "png",
          label:
            actionState.status === "pending" && actionState.action === "png"
              ? "Exporting PNG"
              : "Export PNG",
          onClick: () => handleDownload("png"),
          disabled: actionState.status === "pending",
          variant: "subtle",
        },
      ] satisfies WorkspaceAction[]}
      errorMessage={actionState.status === "error" ? actionState.message : undefined}
      exportDialog={
        actionState.status === "pending" && actionState.action !== "print"
          ? ({
              state: "pending",
              format: actionState.action,
              onClose: () => setActionState({ status: "idle" }),
            } satisfies WorkspaceExportDialog)
          : actionState.status === "success"
            ? ({
                state: "success",
                format: actionState.action,
                onClose: () => setActionState({ status: "idle" }),
                onRetry: () => {
                  if (actionState.action) {
                    void handleDownload(actionState.action);
                  }
                },
              } satisfies WorkspaceExportDialog)
            : actionState.status === "error" && actionState.action
              ? ({
                  state: "error",
                  format: actionState.action,
                  errorMessage: actionState.message,
                  onClose: () => setActionState({ status: "idle" }),
                  onRetry: () => {
                    if (actionState.action) {
                      void handleDownload(actionState.action);
                    }
                  },
              } satisfies WorkspaceExportDialog)
            : undefined
      }
      builderEyebrow="Voucher controls"
      builderTitle="Build the document"
      builderDescription="Move from setup to core details, approvals, and visibility without losing the live preview on the right."
      sections={voucherWorkspaceSections}
      previewEyebrow="Preview"
      previewTitle="Live A4 document"
      previewDescription="Review the final voucher while you edit. Template, branding, and field visibility update immediately."
      builderContent={
        <>
          <div id="voucher-setup" className="scroll-mt-28">
              <FormSection
                eyebrow="Template"
                title="Template and voucher mode"
                description="Switch layouts or voucher type without losing the entered form state."
              >
                <FieldShell label="Voucher template">
                  <div className="grid gap-3">
                    {voucherTemplateOptions.map((template) => {
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
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  {
                    voucherTemplateOptions.find(
                      (template) => template.id === selectedTemplateId,
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
          </div>

          <div id="voucher-branding" className="scroll-mt-28">
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
          </div>

          <div id="voucher-details" className="scroll-mt-28">
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
          </div>

          <div id="voucher-approvals" className="scroll-mt-28">
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
          </div>

          <div id="voucher-visibility" className="scroll-mt-28">
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
        </>
      }
      previewContent={<VoucherPreview document={previewDocument} />}
    />
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
