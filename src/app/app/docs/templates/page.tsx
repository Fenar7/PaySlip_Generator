import {
  TEMPLATE_REGISTRY,
  CATEGORY_LABELS,
  DOCTYPE_LABELS,
  type DocType,
  type TemplateCategory,
} from "@/lib/docs/templates/registry";
import { TemplateStoreClient } from "./template-store-client";
import { getOrgDefaults } from "@/app/app/actions/org-defaults-actions";

export const metadata = {
  title: "Template Store | Slipwise",
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category as TemplateCategory | undefined;
  const activeType = params.type as DocType | undefined;

  const [defaults, filtered] = await Promise.all([
    getOrgDefaults(),
    Promise.resolve(
      TEMPLATE_REGISTRY.filter((t) => {
        if (activeCategory && t.category !== activeCategory) return false;
        if (activeType && !t.docTypes.includes(activeType)) return false;
        return true;
      })
    ),
  ]);

  const currentDefaults = {
    invoice: defaults?.defaultInvoiceTemplate ?? null,
    voucher: defaults?.defaultVoucherTemplate ?? null,
    "salary-slip": defaults?.defaultSlipTemplate ?? null,
  };

  return (
    <div className="slipwise-shell-bg min-h-screen">
      <div className="mx-auto max-w-[80rem] px-3 py-5 sm:px-4 lg:px-5 lg:py-7">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--text-muted)]">
            Document Templates
          </p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--text-primary)] md:text-[2.4rem]">
            Template Store
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Browse Slipwise templates and set your defaults. Each document type can have one default template that loads automatically when you create a new document.
          </p>
        </div>

        {/* Default status bar */}
        <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Current Defaults
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(
              [
                ["invoice", "Invoice", currentDefaults.invoice] as const,
                ["voucher", "Voucher", currentDefaults.voucher] as const,
                ["salary-slip", "Salary Slip", currentDefaults["salary-slip"]] as const,
              ]
            ).map(([type, label, defaultId]) => {
              const template = defaultId
                ? TEMPLATE_REGISTRY.find((t) =>
                    t.docTypes.includes(type) &&
                    (t.templateId === defaultId || t.templateIdByDocType?.[type] === defaultId)
                  )
                : null;
              return (
                <div
                  key={type}
                  className="flex items-center gap-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2.5"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {template?.name ?? (
                      <span className="text-[var(--text-muted)]">No default set</span>
                    )}
                  </span>
                  {template && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-[var(--state-success)]" title="Active default" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 space-y-3">
          {/* Doc type filter */}
          <div className="flex flex-wrap gap-2">
            <a
              href="/app/docs/templates"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                !activeType
                  ? "border border-transparent bg-[var(--text-primary)] text-white shadow-[var(--shadow-xs)]"
                  : "border border-[var(--border-default)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              All Types
            </a>
            {(Object.entries(DOCTYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
              <a
                key={type}
                href={`/app/docs/templates?type=${type}${activeCategory ? `&category=${activeCategory}` : ""}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeType === type
                    ? "border border-transparent bg-[var(--text-primary)] text-white shadow-[var(--shadow-xs)]"
                    : "border border-[var(--border-default)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <a
              href={`/app/docs/templates${activeType ? `?type=${activeType}` : ""}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                !activeCategory
                  ? "border border-transparent bg-[var(--brand-cta)] text-white shadow-[var(--shadow-xs)]"
                  : "border border-[var(--border-default)] bg-white text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              All Categories
            </a>
            {(Object.entries(CATEGORY_LABELS) as [TemplateCategory, string][]).map(
              ([cat, label]) => (
                <a
                  key={cat}
                  href={`/app/docs/templates?category=${cat}${activeType ? `&type=${activeType}` : ""}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? "border border-transparent bg-[var(--brand-cta)] text-white shadow-[var(--shadow-xs)]"
                      : "border border-[var(--border-default)] bg-white text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  {label}
                </a>
              ),
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-primary)]">{filtered.length}</span> template
          {filtered.length !== 1 ? "s" : ""}
          {activeCategory ? ` in ${CATEGORY_LABELS[activeCategory]}` : ""}
          {activeType ? ` for ${DOCTYPE_LABELS[activeType]}` : ""}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-white p-12 text-center">
            <p className="text-[var(--text-muted)]">No templates match your filters.</p>
            <a
              href="/app/docs/templates"
              className="mt-2 inline-block text-sm font-medium text-[var(--brand-primary)] hover:underline"
            >
              Clear all filters
            </a>
          </div>
        ) : (
          <TemplateStoreClient templates={filtered} currentDefaults={currentDefaults} />
        )}
      </div>
    </div>
  );
}
