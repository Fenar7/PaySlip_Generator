"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSopDocument } from "../actions";

export default function NewSopPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createSopDocument({
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
    });
    setSaving(false);
    if (result.success) {
      router.push(`/app/sop/${result.data.id}`);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New SOP</h1>
        <p className="text-sm text-slate-500 mt-1">Document an internal process, policy, or workflow</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Invoice Approval Process"
            required
            className="w-full border rounded-lg px-3 py-2.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Finance, HR, Operations"
              className="w-full border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Excerpt</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary (auto-generated if blank)"
              className="w-full border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the full procedure here. Markdown is supported."
            rows={18}
            required
            className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono resize-y"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm border px-4 py-2.5 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim() || !content.trim()}
            className="text-sm bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
