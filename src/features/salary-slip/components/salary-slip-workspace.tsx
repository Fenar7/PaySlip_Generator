"use client";

import { useState } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DocumentWorkspaceLayout,
  type WorkspaceExportDialog,
  type WorkspaceAction,
  type WorkspaceSectionMeta,
} from "@/components/foundation/document-workspace-layout";
import { FormSection } from "@/components/forms/form-section";
import { FieldShell } from "@/components/forms/field-shell";
import {
  ColorField,
  FileUploadField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/forms/input-primitives";
import { RepeaterSection } from "@/components/forms/repeater-section";
import { salarySlipDefaultValues, salarySlipTemplateOptions } from "@/features/salary-slip/constants";
import { SalarySlipPreview } from "@/features/salary-slip/components/salary-slip-preview";
import { salarySlipFormSchema } from "@/features/salary-slip/schema";
import type { SalarySlipFormValues } from "@/features/salary-slip/types";
import { buildSalarySlipFilename } from "@/features/salary-slip/utils/build-salary-slip-filename";
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";
import { downloadBinaryExport } from "@/lib/browser/download-binary-export";
import { cn } from "@/lib/utils";

type SalarySlipActionState =
  | { status: "idle" }
  | { status: "pending"; action: "print" | "pdf" | "png" }
  | { status: "success"; action: "pdf" | "png" }
  | { status: "error"; action?: "pdf" | "png"; message: string };

const salaryWorkspaceSections: WorkspaceSectionMeta[] = [
  { id: "salary-setup", label: "Setup" },
  { id: "salary-employee", label: "Employee" },
  { id: "salary-period", label: "Period" },
  { id: "salary-compensation", label: "Pay" },
  { id: "salary-disbursement", label: "Disbursement" },
  { id: "salary-visibility", label: "Visibility" },
];

function rowInputClass() {
  return cn(
    "w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.035)] outline-none transition-colors focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--accent-soft)]",
  );
}

function SalaryLineItemsEditor({
  name,
  title,
  description,
  emptyLabel,
}: {
  name: "earnings" | "deductions";
  title: string;
  description: string;
  emptyLabel: string;
}) {
  const { control, register } = useFormContext<SalarySlipFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <RepeaterSection
      title={title}
      description={description}
      actionLabel={`Add ${emptyLabel}`}
      onAdd={() => append({ label: "", amount: "" })}
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_10rem_auto] md:items-end">
            <FieldShell
              label={`${emptyLabel} label`}
              htmlFor={`${name}-${index}-label`}
            >
              <input
                id={`${name}-${index}-label`}
                {...register(`${name}.${index}.label` as const)}
                className={rowInputClass()}
                placeholder={name === "earnings" ? "Basic salary" : "Provident fund"}
              />
            </FieldShell>
            <FieldShell
              label="Amount"
              htmlFor={`${name}-${index}-amount`}
            >
              <input
                id={`${name}-${index}-amount`}
                type="number"
                {...register(`${name}.${index}.amount` as const)}
                className={rowInputClass()}
                placeholder="0"
              />
            </FieldShell>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1 && name === "earnings"}
              className="inline-flex h-[3rem] items-center justify-center rounded-full border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </RepeaterSection>
  );
}

function SalarySlipPanel() {
  const { control, getValues, setValue, trigger } = useFormContextSafe();
  const values = useWatch({ control }) as SalarySlipFormValues;
  const [selectedTemplateId, setSelectedTemplateId] = useState(values.templateId);
  const previewDocumentWithTemplate = normalizeSalarySlip({
    ...values,
    templateId: selectedTemplateId,
  });
  const [actionState, setActionState] = useState<SalarySlipActionState>({
    status: "idle",
  });

  async function prepareDocument() {
    const isValid = await trigger();

    if (!isValid) {
      setActionState({
        status: "error",
        message: "Complete the required salary slip fields before exporting.",
      });
      return null;
    }

    return normalizeSalarySlip({
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
      const endpoint =
        format === "pdf"
          ? "/api/export/salary-slip/pdf"
          : "/api/export/salary-slip/png";
      const payload = JSON.stringify({ document });
      await downloadBinaryExport({
        endpoint,
        payload,
        fallbackFilename: buildSalarySlipFilename(document, format),
      });
      setActionState({ status: "success", action: format });
    } catch (error) {
      setActionState({
        status: "error",
        action: format,
        message:
          error instanceof Error
            ? error.message
            : `Unable to export the salary slip as ${format.toUpperCase()}.`,
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
        message: "Allow popups to open the salary slip print surface.",
      });
      return;
    }

    setActionState({ status: "pending", action: "print" });

    try {
      const response = await fetch("/api/export/salary-slip/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document }),
      });

      if (!response.ok) {
        throw new Error("Unable to prepare the salary slip print surface.");
      }

      const payload = (await response.json()) as { printUrl?: string };

      if (!payload.printUrl) {
        throw new Error("Unable to prepare the salary slip print surface.");
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
            : "Unable to prepare the salary slip print surface.",
      });
    }
  }

  return (
    <DocumentWorkspaceLayout
      eyebrow="Salary slip workspace"
      title="Salary Slip Generator"
      description="Prepare payroll documents in a cleaner workspace with structured employee data, live preview, and export actions that stay close to the final output."
      actions={[
        { id: "home", label: "Back to home", href: "/", variant: "secondary" },
        {
          id: "print",
          label:
            actionState.status === "pending" && actionState.action === "print"
              ? "Preparing print"
              : "Print salary slip",
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
      builderEyebrow="Salary controls"
      builderTitle="Build the payroll document"
      builderDescription="Move through setup, employee data, pay details, and visibility controls while the preview stays available on the right."
      sections={salaryWorkspaceSections}
      previewEyebrow="Preview"
      previewTitle="Live A4 document"
      previewDescription="Review the salary slip while you edit. Payroll rows, attendance context, and optional blocks rebalance immediately."
      builderContent={
        <>
          <div id="salary-setup" className="scroll-mt-28">
              <FormSection
                eyebrow="Template"
                title="Template and branding"
                description="Switch between salary slip layouts without resetting the form."
              >
                <FieldShell label="Salary slip template">
                  <div className="grid gap-3">
                    {salarySlipTemplateOptions.map((template) => {
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
                            "rounded-[1.05rem] border px-4 py-3 text-left shadow-[0_12px_28px_rgba(34,34,34,0.04)] transition-colors",
                            active
                              ? "border-[var(--accent)] bg-white"
                              : "border-[var(--border-soft)] bg-white/88 hover:bg-white",
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
                    salarySlipTemplateOptions.find(
                      (template) => template.id === selectedTemplateId,
                    )?.description
                  }
                </div>
                <TextField<SalarySlipFormValues>
                  name="branding.companyName"
                  label="Company name"
                  placeholder="Northfield Trading Co."
                />
                <TextAreaField<SalarySlipFormValues>
                  name="branding.address"
                  label="Address"
                  rows={3}
                  placeholder="18 Market Road, Kozhikode"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="branding.email"
                    label="Email"
                    placeholder="accounts@example.com"
                  />
                  <TextField<SalarySlipFormValues>
                    name="branding.phone"
                    label="Phone"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ColorField<SalarySlipFormValues>
                    name="branding.accentColor"
                    label="Accent color"
                  />
                  <FileUploadField<SalarySlipFormValues>
                    name="branding.logoDataUrl"
                    label="Logo upload"
                    hint="Session-only asset for the live preview."
                  />
                </div>
              </FormSection>
          </div>

          <div id="salary-employee" className="scroll-mt-28">
              <FormSection
                eyebrow="Employee"
                title="Employee details"
                description="Define the person and role this salary slip belongs to."
              >
                <TextField<SalarySlipFormValues>
                  name="employeeName"
                  label="Employee name"
                  required
                  placeholder="Arun Dev"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="employeeId"
                    label="Employee ID"
                    placeholder="EMP-041"
                  />
                  <TextField<SalarySlipFormValues>
                    name="designation"
                    label="Designation"
                    placeholder="Site Coordinator"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="department"
                    label="Department"
                    placeholder="Operations"
                  />
                  <TextField<SalarySlipFormValues>
                    name="workLocation"
                    label="Work location"
                    placeholder="Kozhikode HQ"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="pan"
                    label="PAN"
                    placeholder="FJTPD2148Q"
                  />
                  <TextField<SalarySlipFormValues>
                    name="uan"
                    label="UAN"
                    placeholder="100458732145"
                  />
                </div>
                <TextField<SalarySlipFormValues>
                  name="joiningDate"
                  label="Joining date"
                  type="date"
                />
              </FormSection>
          </div>

          <div id="salary-period" className="scroll-mt-28">
              <FormSection
                eyebrow="Period"
                title="Pay period and attendance"
                description="Attendance values are informational here and do not drive payroll proration."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="month"
                    label="Month"
                    required
                    placeholder="March"
                  />
                  <TextField<SalarySlipFormValues>
                    name="year"
                    label="Year"
                    required
                    type="number"
                    placeholder="2026"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="payDate"
                    label="Pay date"
                    type="date"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="workingDays"
                    label="Working days"
                    type="number"
                    placeholder="31"
                  />
                  <TextField<SalarySlipFormValues>
                    name="paidDays"
                    label="Paid days"
                    type="number"
                    placeholder="30"
                  />
                  <TextField<SalarySlipFormValues>
                    name="leaveDays"
                    label="Leave days"
                    type="number"
                    placeholder="1"
                  />
                  <TextField<SalarySlipFormValues>
                    name="lossOfPayDays"
                    label="Loss of pay"
                    type="number"
                    placeholder="0"
                  />
                </div>
              </FormSection>
          </div>

          <div id="salary-compensation" className="scroll-mt-28">
              <FormSection
                eyebrow="Compensation"
                title="Earnings and deductions"
                description="Totals and net salary update instantly from the repeatable rows below."
              >
                <SalaryLineItemsEditor
                  name="earnings"
                  title="Earnings"
                  description="Add every earning component that contributes to the gross salary."
                  emptyLabel="earning"
                />
                <SalaryLineItemsEditor
                  name="deductions"
                  title="Deductions"
                  description="List deductions such as provident fund, tax, or salary advances."
                  emptyLabel="deduction"
                />
              </FormSection>
          </div>

          <div id="salary-disbursement" className="scroll-mt-28">
              <FormSection
                eyebrow="Disbursement"
                title="Notes and signature"
                description="This section controls how the pay note and acknowledgement appear in the preview."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="paymentMethod"
                    label="Payment method"
                    placeholder="Bank transfer"
                  />
                  <TextField<SalarySlipFormValues>
                    name="bankName"
                    label="Bank name"
                    placeholder="Federal Bank"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="bankAccountNumber"
                    label="Account number"
                    placeholder="XXXX2841"
                  />
                  <TextField<SalarySlipFormValues>
                    name="bankIfsc"
                    label="IFSC"
                    placeholder="FDRL0001220"
                  />
                </div>
                <TextAreaField<SalarySlipFormValues>
                  name="notes"
                  label="Notes"
                  rows={3}
                  placeholder="Salary credited after attendance review."
                />
                <TextField<SalarySlipFormValues>
                  name="preparedBy"
                  label="Prepared by"
                  placeholder="Anita Thomas"
                />
              </FormSection>
          </div>

          <div id="salary-visibility" className="scroll-mt-28">
              <FormSection
                eyebrow="Visibility"
                title="Show or hide optional blocks"
                description="These controls let the preview collapse optional payroll details cleanly."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showAddress"
                    label="Address"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showEmail"
                    label="Email"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showPhone"
                    label="Phone"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showEmployeeId"
                    label="Employee ID"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showDepartment"
                    label="Department"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showDesignation"
                    label="Designation"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showPan"
                    label="PAN"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showUan"
                    label="UAN"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showBankDetails"
                    label="Bank details"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showJoiningDate"
                    label="Joining date"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showWorkLocation"
                    label="Work location"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showAttendance"
                    label="Attendance summary"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showNotes"
                    label="Notes"
                  />
                  <ToggleField<SalarySlipFormValues>
                    name="visibility.showSignature"
                    label="Signature area"
                  />
                </div>
              </FormSection>
          </div>
        </>
      }
      previewContent={<SalarySlipPreview document={previewDocumentWithTemplate} />}
    />
  );
}

function useFormContextSafe() {
  return useFormContext<SalarySlipFormValues>();
}

export function SalarySlipWorkspace() {
  const methods = useForm<SalarySlipFormValues>({
    resolver: zodResolver(salarySlipFormSchema),
    defaultValues: salarySlipDefaultValues,
    mode: "onChange",
  });

  return (
    <FormProvider {...methods}>
      <SalarySlipPanel />
    </FormProvider>
  );
}
