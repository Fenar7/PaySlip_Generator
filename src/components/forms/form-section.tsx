import type { ReactNode } from "react";

type FormSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function FormSection({
  eyebrow,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="mb-4">
        {eyebrow ? (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-2 text-xl text-[var(--foreground)]">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
