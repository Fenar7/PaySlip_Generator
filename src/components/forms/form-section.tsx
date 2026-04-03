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
    <section className="rounded-xl border border-[var(--border-soft)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-5 border-b border-[var(--border-soft)] pb-4">
        {eyebrow ? (
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-[var(--muted-foreground)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-2 text-[1.22rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-[var(--foreground-soft)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4.5">{children}</div>
    </section>
  );
}
