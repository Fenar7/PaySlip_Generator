"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSopDocument, publishSopDocument } from "../actions";

type SopDoc = NonNullable<Awaited<ReturnType<typeof getSopDocument>>>;

export default function SopDetailPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<SopDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getSopDocument(params.id).then((d) => {
      setDoc(d);
      setLoading(false);
    });
  }, [params.id]);

  async function handlePublish() {
    if (!params.id) return;
    setPublishing(true);
    setError(null);
    const result = await publishSopDocument(params.id);
    setPublishing(false);
    if (result.success) {
      const updated = await getSopDocument(params.id);
      setDoc(updated);
    } else {
      setError(result.error);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!doc) return <div className="p-8 text-center text-slate-400">SOP not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
        <Link href="/app/sop" className="hover:text-blue-600">Knowledge Base</Link>
        {doc.category && (
          <>
            <span>/</span>
            <span>{doc.category}</span>
          </>
        )}
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {doc.isPinned && <span>📌</span>}
            <h1 className="text-2xl font-bold text-slate-900">{doc.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              doc.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
              doc.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" :
              "bg-slate-100 text-slate-500"
            }`}>
              {doc.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {doc.publishedAt
              ? `Published ${new Date(doc.publishedAt).toLocaleDateString("en-IN")}`
              : `Last updated ${new Date(doc.updatedAt).toLocaleDateString("en-IN")}`}
          </p>
        </div>
        <div className="flex gap-2">
          {doc.status === "DRAFT" && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
          <Link
            href={`/app/sop/${doc.id}/edit`}
            className="text-sm border px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            Edit
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {doc.content}
        </div>
      </div>
    </div>
  );
}
