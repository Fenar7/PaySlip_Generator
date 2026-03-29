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
      className="group relative overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.96))] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_42%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="relative flex h-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              {module.eyebrow}
            </p>
            <h3 className="mt-3 text-2xl leading-tight text-[var(--foreground)]">
              {module.name}
            </h3>
          </div>
          <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
            {slipwiseBrand.shellBadge}
          </span>
        </div>

        <p className="max-w-sm text-sm leading-7 text-[var(--muted-foreground)]">
          {module.description}
        </p>

        <ul className="space-y-2 text-sm text-[var(--foreground-soft)]">
          {module.highlights.map((highlight) => (
            <li key={highlight} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {highlight}
            </li>
          ))}
        </ul>

        <Link
          href={`/${module.slug}`}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--foreground-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          Open workspace
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </motion.article>
  );
}
