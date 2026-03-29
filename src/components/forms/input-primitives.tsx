"use client";

import {
  Controller,
  get,
  useFormContext,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { FieldShell } from "@/components/forms/field-shell";
import { cn } from "@/lib/utils";

function baseInputClass(hasError?: boolean) {
  return cn(
    "w-full rounded-[1rem] border bg-white px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition-colors",
    hasError
      ? "border-[var(--danger)] focus:border-[var(--danger)]"
      : "border-[var(--border-soft)] focus:border-[var(--accent)]",
  );
}

type BaseFieldProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  label: string;
  hint?: string;
  required?: boolean;
};

type TextFieldProps<TFormValues extends FieldValues> = BaseFieldProps<TFormValues> & {
  type?: "text" | "number" | "date";
  placeholder?: string;
};

export function TextField<TFormValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  type = "text",
  placeholder,
}: TextFieldProps<TFormValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFormValues>();
  const fieldError = get(errors, name)?.message;

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      hint={hint}
      required={required}
      error={typeof fieldError === "string" ? fieldError : undefined}
    >
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={baseInputClass(Boolean(fieldError))}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps<TFormValues extends FieldValues> = BaseFieldProps<TFormValues> & {
  placeholder?: string;
  rows?: number;
};

export function TextAreaField<TFormValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  placeholder,
  rows = 4,
}: TextAreaFieldProps<TFormValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFormValues>();
  const fieldError = get(errors, name)?.message;

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      hint={hint}
      required={required}
      error={typeof fieldError === "string" ? fieldError : undefined}
    >
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        {...register(name)}
        className={cn(baseInputClass(Boolean(fieldError)), "resize-y")}
      />
    </FieldShell>
  );
}

type SelectFieldProps<TFormValues extends FieldValues> = BaseFieldProps<TFormValues> & {
  options: Array<{ value: string; label: string }>;
};

export function SelectField<TFormValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  options,
}: SelectFieldProps<TFormValues>) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<TFormValues>();
  const fieldError = get(errors, name)?.message;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FieldShell
          label={label}
          htmlFor={name}
          hint={hint}
          required={required}
          error={typeof fieldError === "string" ? fieldError : undefined}
        >
          <select
            id={name}
            name={field.name}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(event) =>
              setValue(name, event.target.value as Path<TFormValues> extends never ? never : TFormValues[Path<TFormValues>], {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
            onBlur={field.onBlur}
            ref={field.ref}
            className={baseInputClass(Boolean(fieldError))}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
      )}
    />
  );
}

type ToggleFieldProps<TFormValues extends FieldValues> = BaseFieldProps<TFormValues>;

export function ToggleField<TFormValues extends FieldValues>({
  name,
  label,
  hint,
}: ToggleFieldProps<TFormValues>) {
  const { control } = useFormContext<TFormValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FieldShell label={label} hint={hint}>
          <button
            id={name}
            type="button"
            role="switch"
            aria-label={label}
            aria-checked={Boolean(field.value)}
            onClick={() => field.onChange(!field.value)}
            className={cn(
              "flex w-full items-center justify-between rounded-[1rem] border px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]",
              field.value
                ? "border-[var(--accent)] bg-white"
                : "border-[var(--border-soft)] bg-white/80",
            )}
          >
            <span className="text-sm text-[var(--foreground)]">
              {field.value ? "Visible in preview" : "Hidden from preview"}
            </span>
            <span
              className={cn(
                "relative inline-flex h-7 w-12 rounded-full transition-colors",
                field.value ? "bg-[var(--accent)]" : "bg-[rgba(29,23,16,0.12)]",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                  field.value ? "translate-x-6" : "translate-x-1",
                )}
              />
            </span>
          </button>
        </FieldShell>
      )}
    />
  );
}

type ColorFieldProps<TFormValues extends FieldValues> = BaseFieldProps<TFormValues>;

export function ColorField<TFormValues extends FieldValues>({
  name,
  label,
  hint,
}: ColorFieldProps<TFormValues>) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<TFormValues>();
  const fieldError = get(errors, name)?.message;
  const colorValue = watch(name) as string | undefined;

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      hint={hint}
      error={typeof fieldError === "string" ? fieldError : undefined}
    >
      <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <input
          id={name}
          type="color"
          {...register(name)}
          className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--border-soft)] bg-transparent p-1"
        />
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {colorValue || "#c69854"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Used for headers and highlights in the preview.
          </p>
        </div>
      </div>
    </FieldShell>
  );
}

type FileUploadFieldProps<TFormValues extends FieldValues> = BaseFieldProps<TFormValues>;

export function FileUploadField<TFormValues extends FieldValues>({
  name,
  label,
  hint,
}: FileUploadFieldProps<TFormValues>) {
  const { control, setError, clearErrors } = useFormContext<TFormValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FieldShell
          label={label}
          hint={hint}
          error={fieldState.error?.message}
        >
          <div className="space-y-3 rounded-[1rem] border border-[var(--border-soft)] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  field.onChange("");
                  clearErrors(name);
                  return;
                }

                const isValidType = [
                  "image/png",
                  "image/jpeg",
                  "image/webp",
                  "image/svg+xml",
                ].includes(file.type);

                if (!isValidType) {
                  setError(name, {
                    type: "manual",
                    message: "Upload PNG, JPG, WEBP, or SVG only.",
                  });
                  return;
                }

                if (file.size > 1_500_000) {
                  setError(name, {
                    type: "manual",
                    message: "Keep logo files under 1.5 MB.",
                  });
                  return;
                }

                const dataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result ?? ""));
                  reader.onerror = () => reject(reader.error);
                  reader.readAsDataURL(file);
                });

                clearErrors(name);
                field.onChange(dataUrl);
              }}
              className="block w-full text-sm text-[var(--foreground)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--foreground)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--background)]"
            />

            {field.value ? (
              <div className="flex items-center justify-between rounded-[0.9rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3">
                <p className="text-xs text-[var(--foreground-soft)]">
                  Logo loaded into the current session preview.
                </p>
                <button
                  type="button"
                  onClick={() => field.onChange("")}
                  className="text-xs font-medium text-[var(--foreground)] underline decoration-[var(--accent)] underline-offset-4"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        </FieldShell>
      )}
    />
  );
}
