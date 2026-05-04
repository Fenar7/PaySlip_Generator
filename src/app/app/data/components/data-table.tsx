"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  entityType: string;
  editPath: string;
  deleteAction: (id: string) => Promise<{ success: boolean; error?: string }>;
  total: number;
  page: number;
  totalPages: number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  entityType,
  editPath,
  deleteAction,
  total,
  page,
  totalPages,
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${entityType}?`)) return;

    startTransition(async () => {
      const result = await deleteAction(id);
      if (!result.success) {
        alert(result.error || "Failed to delete");
      }
    });
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const pageSize = 20;
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className={cn("slipwise-panel overflow-hidden", className)}>
      {/* Search bar */}
      <div className="border-b border-[var(--border-soft)] px-5 py-3">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${entityType}s...`}
              className="w-full rounded-lg border border-[var(--border-default)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-subtle)] text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-5 py-12 text-center"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">No {entityType}s found</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Try adjusting your search or create a new {entityType}.
                  </p>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5 text-sm text-[var(--text-primary)]">
                      {col.render
                        ? col.render(item as unknown as T)
                        : ((item as Record<string, unknown>)[col.key] as string) || "—"}
                    </td>
                  ))}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                      <Link
                        href={`${editPath}/${item.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--brand-primary)] transition-colors hover:bg-[var(--surface-selected)]"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--state-danger)] transition-colors hover:bg-[var(--state-danger-soft)] disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-5 py-3">
          <p className="text-xs text-[var(--text-muted)]">
            Showing {startItem}–{endItem} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="inline-flex items-center rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="mr-1 h-3 w-3" />
              Previous
            </button>
            <span className="px-2 text-xs font-medium text-[var(--text-muted)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="inline-flex items-center rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="ml-1 h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
