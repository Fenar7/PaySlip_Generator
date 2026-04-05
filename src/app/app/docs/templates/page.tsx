import {
  TEMPLATE_REGISTRY,
  CATEGORY_LABELS,
  DOCTYPE_LABELS,
  type DocType,
  type TemplateCategory,
} from "@/lib/docs/templates/registry";
import { TemplateCard } from "./template-card";

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

  const filtered = TEMPLATE_REGISTRY.filter((t) => {
    if (activeCategory && t.category !== activeCategory) return false;
    if (activeType && !t.docTypes.includes(activeType)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Template Store</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse professional templates for invoices, vouchers, and salary slips. Apply once or
            set as your default.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Doc type filter */}
          <div className="flex flex-wrap gap-2">
            <a
              href="/app/docs/templates"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !activeType
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All Types
            </a>
            {(Object.entries(DOCTYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
              <a
                key={type}
                href={`/app/docs/templates?type=${type}${activeCategory ? `&category=${activeCategory}` : ""}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeType === type
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
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
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !activeCategory
                  ? "bg-red-600 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              All Categories
            </a>
            {(Object.entries(CATEGORY_LABELS) as [TemplateCategory, string][]).map(
              ([cat, label]) => (
                <a
                  key={cat}
                  href={`/app/docs/templates?category=${cat}${activeType ? `&type=${activeType}` : ""}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-red-600 text-white"
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </a>
              ),
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="mb-4 text-sm text-slate-500">
          {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          {activeCategory ? ` in ${CATEGORY_LABELS[activeCategory]}` : ""}
          {activeType ? ` for ${DOCTYPE_LABELS[activeType]}` : ""}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-500">No templates match your filters.</p>
            <a
              href="/app/docs/templates"
              className="mt-2 inline-block text-sm text-red-600 hover:underline"
            >
              Clear filters
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
