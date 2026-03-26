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
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";
import { cn } from "@/lib/utils";

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
  const { control, setValue } = useFormContextSafe();
  const values = useWatch({ control }) as SalarySlipFormValues;
  const [selectedTemplateId, setSelectedTemplateId] = useState(values.templateId);
  const previewDocumentWithTemplate = normalizeSalarySlip({
    ...values,
    templateId: selectedTemplateId,
  });

  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(198,152,84,0.16),transparent_38%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)] lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              Salary slip workspace
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-[var(--foreground)] md:text-5xl">
              Salary Slip Generator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
              Build salary slips with business branding, payroll breakdowns, attendance
              context, and a live A4 preview ready for the export phase.
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
                  Salary controls
                </p>
                <h2 className="mt-3 text-2xl text-[var(--foreground)]">
                  Payroll document builder
                </h2>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                Phase 3
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
                <TextField<SalarySlipFormValues>
                  name="department"
                  label="Department"
                  placeholder="Operations"
                />
              </FormSection>

              <FormSection
                eyebrow="Period"
                title="Pay period and attendance"
                description="Attendance values are informational here and do not drive payroll proration."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField<SalarySlipFormValues>
                    name="payPeriodLabel"
                    label="Salary period"
                    required
                    placeholder="March 2026"
                  />
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
                <TextField<SalarySlipFormValues>
                  name="bankAccountNumber"
                  label="Account number"
                  placeholder="XXXX2841"
                />
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
                    name="visibility.showBankDetails"
                    label="Bank details"
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
