"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { slipwiseBrand } from "@/components/foundation/slipwise-brand";
import type { ProductModule } from "@/lib/modules";

type ModuleCardProps = {
  module: ProductModule;
  index: number;
};

export function ModuleCard({ module, index }: ModuleCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-[2.25rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,247,253,0.98))] p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(49,93,246,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_32%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="relative flex h-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
              {module.eyebrow}
            </p>
            <h3 className="mt-3 max-w-[14ch] text-[1.65rem] leading-[1.04] tracking-[-0.045em] text-[var(--foreground)] md:text-[1.9rem]">
              {module.name}
            </h3>
          </div>
          <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)] shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            {slipwiseBrand.shellBadge}
          </span>
        </div>

        <p className="max-w-sm text-[0.95rem] leading-7 text-[var(--muted-foreground)]">
          {module.description}
        </p>

        <ul className="space-y-2 text-[0.95rem] text-[var(--foreground-soft)]">
          {module.highlights.map((highlight) => (
            <li key={highlight} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] shadow-[0_0_0_6px_rgba(49,93,246,0.08)]" />
              {highlight}
            </li>
          ))}
        </ul>

        <Link
          href={`/${module.slug}`}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--foreground),#1f2937)] px-4 py-2 text-sm font-medium text-[var(--background)] shadow-[0_16px_30px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          Open generator
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </motion.article>
  );
}
