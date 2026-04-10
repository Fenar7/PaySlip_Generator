"use client";

import { useEffect, useState, useTransition } from "react";
import { browseTemplates } from "./actions";

const CATEGORIES = ["All", "Invoice", "Voucher", "Salary Slip"] as const;
const PRICE_FILTERS = ["all", "free", "paid"] as const;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "top-rated", label: "Top Rated" },
] as const;

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  templateType: string;
  category: string[];
  price: number;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  publisherId: string;
  previewImageUrl: string;
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [priceFilter, setPriceFilter] =
    useState<(typeof PRICE_FILTERS)[number]>("all");
  const [sort, setSort] =
    useState<"popular" | "newest" | "top-rated">("newest");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const pageSize = 12;

  useEffect(() => {
    async function load() {
      const filters: Parameters<typeof browseTemplates>[0] = {
        search: search || undefined,
        category: category !== "All" ? category : undefined,
        priceFilter,
        sort,
        page,
        pageSize,
      };

      const result = await browseTemplates(filters);
      if (result.success) {
        setTemplates(result.data.templates);
        setTotal(result.data.total);
      }
    }

    startTransition(() => {
      load();
    });
  }, [search, category, priceFilter, sort, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Template Marketplace
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and install professional templates for your documents
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:max-w-sm"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Price:</span>
          {PRICE_FILTERS.map((pf) => (
            <button
              key={pf}
              onClick={() => {
                setPriceFilter(pf);
                setPage(1);
              }}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                priceFilter === pf
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {pf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort:</span>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "popular" | "newest" | "top-rated")
            }
            className="border-input bg-background rounded-md border px-3 py-1 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {total > 0 && (
          <span className="text-muted-foreground ml-auto text-sm">
            {total} template{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Template grid */}
      {isPending ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No templates found. Try adjusting your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="bg-muted hover:bg-muted/80 rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="bg-muted hover:bg-muted/80 rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: TemplateItem }) {
  return (
    <div className="bg-card border-border hover:border-primary/50 rounded-lg border p-4 transition-colors">
      {template.previewImageUrl && (
        <div className="bg-muted mb-3 aspect-video overflow-hidden rounded-md">
          <img
            src={template.previewImageUrl}
            alt={template.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">
            {template.name}
          </h3>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
              template.price === 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {template.price === 0 ? "FREE" : `₹${template.price}`}
          </span>
        </div>

        <p className="text-muted-foreground line-clamp-2 text-xs">
          {template.description}
        </p>

        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            {"★".repeat(Math.round(template.rating))}
            {"☆".repeat(5 - Math.round(template.rating))}
            <span className="ml-0.5">({template.reviewCount})</span>
          </span>
          <span>{template.downloadCount} installs</span>
        </div>

        <div className="text-muted-foreground text-xs">
          {template.templateType}
        </div>
      </div>
    </div>
  );
}
