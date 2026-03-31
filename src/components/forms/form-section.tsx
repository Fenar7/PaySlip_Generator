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
    <section className="rounded-[1.7rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,243,237,0.96))] p-5 shadow-[0_14px_30px_rgba(34,34,34,0.05)]">
      <div className="mb-5 border-b border-[var(--border-soft)] pb-4">
        {eyebrow ? (
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-[var(--muted-foreground)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-2 text-[1.18rem] font-medium leading-tight tracking-[-0.02em] text-[var(--foreground)]">
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
