"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthHeroHighlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

interface AuthHeroPanelProps {
  badge?: string;
  title: string;
  description: string;
  highlights: AuthHeroHighlight[];
  supportingPoints?: string[];
  footer?: string;
  className?: string;
}

export function AuthHeroPanel({
  badge,
  title,
  description,
  highlights,
  supportingPoints = [],
  footer,
  className,
}: AuthHeroPanelProps) {
  return (
    <aside
      className={cn(
        "relative hidden h-full overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(247,241,235,0.96))] p-8 shadow-[0_30px_80px_rgba(34,34,34,0.08)] lg:flex lg:flex-col",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,34,34,0.05),transparent_32%)]" />
      <div className="pointer-events-none absolute right-[-3rem] top-10 h-48 w-48 rounded-full bg-[rgba(220,38,38,0.10)] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-4rem] left-[-2rem] h-56 w-56 rounded-full bg-white/70 blur-[120px]" />

      <div className="relative flex h-full flex-col">
        {badge && (
          <span className="inline-flex w-fit items-center rounded-full border border-[rgba(220,38,38,0.16)] bg-white/80 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)] shadow-[var(--shadow-soft)]">
            {badge}
          </span>
        )}

        <div className="mt-6 max-w-xl">
          <h2 className="text-[2.3rem] leading-[1.02] tracking-[-0.05em] text-[var(--foreground)]">
            {title}
          </h2>
          <p className="mt-4 text-[1rem] leading-8 text-[var(--foreground-soft)]">
            {description}
          </p>
        </div>

        {supportingPoints.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {supportingPoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white/88 px-3.5 py-2 text-xs font-medium text-[var(--foreground-soft)] shadow-[var(--shadow-soft)]"
              >
                {point}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;

            return (
              <div
                key={highlight.title}
                className="rounded-[1.5rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_36px_rgba(34,34,34,0.06)] backdrop-blur"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {highlight.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-7 text-[var(--foreground-soft)]">
                      {highlight.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {footer && (
          <div className="mt-auto rounded-[1.6rem] border border-[var(--border-soft)] bg-white/76 p-5 text-sm leading-7 text-[var(--foreground-soft)] shadow-[var(--shadow-soft)] backdrop-blur">
            {footer}
          </div>
        )}
      </div>
    </aside>
  );
}
