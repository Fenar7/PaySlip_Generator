"use client";

import Link from "next/link";
import { useState } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { cn } from "@/lib/utils";

type SalarySlipActionState =
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

  return `Unable to export the salary slip as ${format.toUpperCase()}.`;
}

function rowInputClass() {
  return cn(
    "w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_12px_30px_rgba(38,30,20,0.04)] outline-none transition-colors focus:border-[var(--accent)]",
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
      const response = await fetch(`/api/export/salary-slip/${format}`, {
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
      link.download = buildSalarySlipFilename(document, format);
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setActionState({ status: "idle" });
    } catch (error) {
      setActionState({
        status: "error",
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
    <main className="slipwise-shell-bg relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(45,107,255,0.18),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(103,203,255,0.12),transparent_26%)]" />
      <div className="mx-auto flex w-full max-w-[var(--container-shell)] flex-col gap-8 px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
        <div className="flex flex-col gap-6 rounded-[2.5rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,248,253,0.96))] p-6 shadow-[var(--shadow-card)] backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
              Salary slip workspace
            </p>
            <h1 className="mt-4 max-w-2xl text-[2.6rem] leading-[0.98] tracking-[-0.05em] text-[var(--foreground)] md:text-[3.6rem]">
              Salary Slip Generator
            </h1>
            <p className="mt-4 max-w-2xl text-[1.02rem] leading-8 text-[var(--muted-foreground)]">
              Build salary slips with business branding, payroll breakdowns, attendance
              context, and a live A4 preview ready for the export phase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-[var(--surface-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Back to home
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              disabled={actionState.status === "pending"}
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-[var(--surface-accent)] disabled:cursor-wait disabled:opacity-65"
            >
              {actionState.status === "pending" && actionState.action === "print"
                ? "Preparing print"
                : "Print salary slip"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("pdf")}
              disabled={actionState.status === "pending"}
              className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--foreground),#1f2937)] px-4 py-2 text-sm font-medium text-[var(--background)] shadow-[0_16px_32px_rgba(15,23,42,0.14)] transition-colors hover:bg-[var(--foreground-soft)] disabled:cursor-wait disabled:opacity-65"
            >
              {actionState.status === "pending" && actionState.action === "pdf"
                ? "Exporting PDF"
                : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("png")}
              disabled={actionState.status === "pending"}
              className="inline-flex items-center justify-center rounded-full bg-[var(--surface-accent)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-[var(--surface-accent-strong)] disabled:cursor-wait disabled:opacity-65"
            >
              {actionState.status === "pending" && actionState.action === "png"
                ? "Exporting PNG"
                : "Export PNG"}
            </button>
          </div>
        </div>

        {actionState.status === "error" ? (
          <div className="rounded-[1.5rem] border border-[rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.06)] px-5 py-4 text-sm text-[var(--danger)] shadow-[var(--shadow-soft)]">
            {actionState.message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(23rem,29rem)_minmax(0,1fr)]">
          <section className="rounded-[2.25rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,248,253,0.96))] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                  Salary controls
                </p>
                <h2 className="mt-3 text-[1.55rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                  Payroll document builder
                </h2>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                Export ready
              </span>
            </div>

            <div className="space-y-4">
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
          </section>

          <section>
            <SalarySlipPreview document={previewDocumentWithTemplate} />
          </section>
        </div>
      </div>
    </main>
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
