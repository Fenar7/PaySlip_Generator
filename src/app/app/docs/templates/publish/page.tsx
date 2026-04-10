"use client";

import { useState, useTransition } from "react";
import { publishTemplate } from "../marketplace/actions";

const TEMPLATE_TYPES = ["Invoice", "Voucher", "Salary Slip"] as const;
const CATEGORY_OPTIONS = [
  "Invoice",
  "Voucher",
  "Salary Slip",
  "GST",
  "Professional",
  "Creative",
  "Minimal",
] as const;

export default function PublishTemplatePage() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("0");
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const handleCategoryToggle = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await publishTemplate({
        name,
        description,
        templateType,
        category: categories,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        price: parseFloat(price) || 0,
        templateData: {},
        previewImageUrl,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  };

  if (submitted) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-8">
          <h2 className="text-xl font-bold text-green-700 dark:text-green-400">
            Template Submitted!
          </h2>
          <p className="text-muted-foreground mt-2">
            Your template has been submitted for review. You&apos;ll be notified
            once it&apos;s approved and published.
          </p>
          <a
            href="/app/docs/templates/marketplace"
            className="text-primary mt-4 inline-block hover:underline"
          >
            ← Back to Marketplace
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Publish Template</h1>
        <p className="text-muted-foreground mt-1">
          Share your template with the Slipwise community (requires Pro plan)
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Template Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Professional Invoice Template"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="A clean, professional invoice template with..."
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Template Type
          </label>
          <select
            required
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select type...</option>
            {TEMPLATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Categories */}
        <div>
          <label className="mb-2 block text-sm font-medium">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <label
                key={cat}
                className={`cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors ${
                  categories.includes(cat)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={categories.includes(cat)}
                  onChange={() => handleCategoryToggle(cat)}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="modern, professional, gst"
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-1 block text-sm font-medium">Price (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Set to 0 for a free template
          </p>
        </div>

        {/* Preview Image URL */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Preview Image URL
          </label>
          <input
            type="url"
            value={previewImageUrl}
            onChange={(e) => setPreviewImageUrl(e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit for Review"}
        </button>
      </form>
    </div>
  );
}
