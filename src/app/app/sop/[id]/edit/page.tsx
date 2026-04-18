"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSopDocument, updateSopDocument, publishSopDocument } from "../../actions";

type SopDoc = NonNullable<Awaited<ReturnType<typeof getSopDocument>>>;

export default function EditSopPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<SopDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getSopDocument(params.id).then((d) => {
      if (d) {
        setDoc(d);
        setTitle(d.title);
        setCategory(d.category ?? "");
        setContent(d.content);
        setExcerpt(d.excerpt ?? "");
      }
      setLoading(false);
    });
  }, [params.id]);

  async function handleSave(publish = false) {
    if (!params.id || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    const result = await updateSopDocument(params.id, {
      title: title.trim(),
      category: category.trim() || undefined,
      content: content.trim(),
      excerpt: excerpt.trim() || undefined,
    });
    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }
    if (publish) {
      const pubResult = await publishSopDocument(params.id);
      if (!pubResult.success) {
        setError(pubResult.error);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    router.push(`/app/sop/${params.id}`);
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!doc) return <div className="p-8 text-center text-slate-400">SOP not found.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit SOP</h1>
        <p className="text-sm text-slate-500 mt-1">{doc.slug}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
              className="w-full border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Excerpt</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
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
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="text-sm border px-4 py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          {doc.status !== "PUBLISHED" && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="text-sm bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Save & Publish"}
            </button>
          )}
          {doc.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="text-sm bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
