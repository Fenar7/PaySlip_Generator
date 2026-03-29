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
    <section className="rounded-[1.7rem] border border-[var(--border-strong)] bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
      <div className="mb-5 border-b border-[var(--border-soft)] pb-4">
        {eyebrow ? (
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-2 text-[1.25rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
