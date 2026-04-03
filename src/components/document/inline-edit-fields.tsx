"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

const baseClass =
  "bg-transparent border-0 border-b border-transparent w-full rounded-sm px-1 py-0.5 transition-all outline-none placeholder:text-[var(--muted-foreground)] hover:border-b-[var(--border-soft)] hover:bg-[var(--surface-soft)] focus:border-b-[var(--accent)] focus:bg-white";

type FieldProps = {
  name: string;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
};

export function InlineTextField({ name, placeholder, className, readOnly }: FieldProps) {
  const { register } = useFormContext();
  return (
    <input
      type="text"
      placeholder={placeholder}
      readOnly={readOnly}
      {...register(name)}
      className={cn(baseClass, className)}
    />
  );
}

export function InlineTextArea({ name, placeholder, className, readOnly }: FieldProps & { rows?: number }) {
  const { register } = useFormContext();
  return (
    <textarea
      placeholder={placeholder}
      readOnly={readOnly}
      rows={2}
      {...register(name)}
      className={cn(baseClass, "resize-none", className)}
    />
  );
}

export function InlineNumberField({ name, placeholder, className, readOnly }: FieldProps) {
  const { register } = useFormContext();
  return (
    <input
      type="number"
      placeholder={placeholder}
      readOnly={readOnly}
      {...register(name)}
      className={cn(baseClass, className)}
    />
  );
}

export function InlineDateField({ name, placeholder, className, readOnly }: FieldProps) {
  const { register } = useFormContext();
  return (
    <input
      type="date"
      placeholder={placeholder}
      readOnly={readOnly}
      {...register(name)}
      className={cn(baseClass, className)}
    />
  );
}

type SelectOption = { value: string; label: string };

export function InlineSelectField({
  name,
  options,
  className,
}: {
  name: string;
  options: SelectOption[];
  className?: string;
}) {
  const { register } = useFormContext();
  return (
    <select
      {...register(name)}
      className={cn(
        baseClass,
        "cursor-pointer appearance-none hover:border-b-[var(--border-soft)] focus:border-b-[var(--accent)]",
        className,
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
