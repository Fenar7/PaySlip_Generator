"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

interface ToolCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  available: boolean;
}

const pageOrganizationTools: ToolCard[] = [
  {
    title: "Create PDF",
    description: "Convert images to a single PDF document",
    icon: "📄",
    href: "/app/docs/pdf-studio/create",
    available: true,
  },
  {
    title: "Merge PDFs",
    description: "Combine multiple PDFs into one file",
    icon: "📑",
    href: "/app/docs/pdf-studio/merge",
    available: true,
  },
  {
    title: "Split PDF",
    description: "Divide a PDF into multiple files",
    icon: "✂️",
    href: "/app/docs/pdf-studio/split",
    available: true,
  },
  {
    title: "Delete Pages",
    description: "Remove unwanted pages from a PDF",
    icon: "🗑️",
    href: "/app/docs/pdf-studio/delete-pages",
    available: true,
  },
  {
    title: "Organize Pages",
    description: "Reorder, rotate, and manage pages",
    icon: "🔀",
    href: "/app/docs/pdf-studio/organize",
    available: true,
  },
  {
    title: "Resize Pages",
    description: "Change page dimensions and format",
    icon: "📐",
    href: "/app/docs/pdf-studio/resize-pages",
    available: true,
  },
];

const editTools: ToolCard[] = [
  {
    title: "Fill & Sign",
    description: "Add text, signatures, and annotations",
    icon: "✍️",
    href: "#",
    available: false,
  },
  {
    title: "Protect / Unlock",
    description: "Add or remove PDF password protection",
    icon: "🔒",
    href: "#",
    available: false,
  },
  {
    title: "Header & Footer",
    description: "Add headers, footers, and page numbers",
    icon: "📝",
    href: "#",
    available: false,
  },
];

const convertTools: ToolCard[] = [
  {
    title: "PDF to Image",
    description: "Export PDF pages as JPG or PNG images",
    icon: "🖼️",
    href: "/app/docs/pdf-studio/pdf-to-image",
    available: true,
  },
  {
    title: "Extract Images",
    description: "Pull embedded raster images out of a PDF file",
    icon: "🗂️",
    href: "/app/docs/pdf-studio/extract-images",
    available: true,
  },
];

interface ToolCategoryProps {
  title: string;
  tools: ToolCard[];
}

function ToolCategory({ title, tools }: ToolCategoryProps) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCardItem key={tool.title} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function ToolCardItem({ tool }: { tool: ToolCard }) {
  const content = (
    <div
      className={cn(
        "group relative flex items-start gap-4 rounded-xl border border-[var(--border-strong)] bg-white p-4 shadow-[var(--shadow-card)] transition-all",
        tool.available
          ? "cursor-pointer hover:border-[var(--accent)] hover:shadow-md"
          : "cursor-default opacity-60"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-xl">
        {tool.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {tool.title}
          </h3>
          {!tool.available && <Badge variant="soon">Soon</Badge>}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {tool.description}
        </p>
      </div>
      {tool.available && (
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </div>
  );

  if (!tool.available) return content;

  return (
    <Link href={tool.href} className="block">
      {content}
    </Link>
  );
}

export function PdfStudioHub() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_1px_3px_rgba(220,38,38,0.3)]">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 3h8l4 4v14H7z" />
              <path d="M15 3v4h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
              PDF Studio
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              All-in-one PDF tools — free, private, browser-based
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ToolCategory title="Page Organization" tools={pageOrganizationTools} />
        <ToolCategory title="Edit & Enhance" tools={editTools} />
        <ToolCategory title="Convert & Export" tools={convertTools} />
      </div>
    </div>
  );
}
