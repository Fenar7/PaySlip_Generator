"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listSopDocuments, listSopCategories, archiveSopDocument } from "./actions";

type SopDoc = Awaited<ReturnType<typeof listSopDocuments>>[number];

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

export default function SopPage() {
  const [docs, setDocs] = useState<SopDoc[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  async function reload() {
    const [docsResult, cats] = await Promise.all([
      listSopDocuments({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as "DRAFT" | "PUBLISHED" | "ARCHIVED") : undefined,
        search: search.trim() || undefined,
      }),
      listSopCategories(),
    ]);
    setDocs(docsResult);
    setCategories(cats);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const [docsResult, cats] = await Promise.all([
        listSopDocuments({
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          status: statusFilter !== "all" ? (statusFilter as "DRAFT" | "PUBLISHED" | "ARCHIVED") : undefined,
          search: search.trim() || undefined,
        }),
        listSopCategories(),
      ]);
      if (!cancelled) {
        setDocs(docsResult);
        setCategories(cats);
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [categoryFilter, statusFilter, search]);

  async function handleArchive(id: string) {
    if (!confirm("Archive this SOP?")) return;
    await archiveSopDocument(id);
    await reload();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SOP Knowledge Base</h1>
          <p className="text-sm text-slate-500 mt-1">Internal business processes, policies, and workflows</p>
        </div>
        <Link
          href="/app/sop/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New SOP
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search SOPs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1 min-w-48"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">No SOPs yet</p>
          <Link href="/app/sop/new" className="text-blue-600 hover:underline text-sm">
            Create your first SOP →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {doc.isPinned && <span className="text-xs text-amber-600">📌</span>}
                    <Link
                      href={`/app/sop/${doc.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 truncate"
                    >
                      {doc.title}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {doc.status}
                    </span>
                    {doc.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {doc.category}
                      </span>
                    )}
                  </div>
                  {doc.excerpt && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{doc.excerpt}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Updated {new Date(doc.updatedAt).toLocaleDateString("en-IN")}
                    {doc.publishedAt && ` · Published ${new Date(doc.publishedAt).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/app/sop/${doc.id}/edit`}
                    className="text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded border hover:border-blue-300"
                  >
                    Edit
                  </Link>
                  {doc.status !== "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => handleArchive(doc.id)}
                      className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded border hover:border-red-200"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
