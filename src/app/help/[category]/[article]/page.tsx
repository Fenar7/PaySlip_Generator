import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/help";

interface Props {
  params: Promise<{ category: string; article: string }>;
}

export default async function HelpArticlePage({ params }: Props) {
  const { category, article: articleSlug } = await params;
  const article = await getArticleBySlug(category, articleSlug);

  if (!article || !article.content) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-foreground">
          Help Center
        </Link>
        <span>/</span>
        <span>{article.categoryTitle}</span>
        <span>/</span>
        <span className="text-foreground">{article.title}</span>
      </nav>

      {/* Article Content */}
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: markdownToHtml(article.content) }} />
      </article>

      {/* Navigation */}
      <div className="mt-12 border-t pt-6">
        <Link
          href="/help"
          className="text-sm text-primary hover:underline"
        >
          ← Back to Help Center
        </Link>
      </div>
    </div>
  );
}

/**
 * Minimal markdown-to-HTML converter for help articles.
 * Handles headings, paragraphs, lists, code blocks, tables, and links.
 */
function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Tables
  html = html.replace(
    /^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm,
    (_match, headerRow: string, bodyRows: string) => {
      const headers = headerRow.split("|").map((h: string) => h.trim()).filter(Boolean);
      const rows = bodyRows.trim().split("\n").map((row: string) =>
        row.split("|").map((c: string) => c.trim()).filter(Boolean)
      );
      const thead = `<thead><tr>${headers.map((h: string) => `<th>${h}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r: string[]) => `<tr>${r.map((c: string) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
      return `<table>${thead}${tbody}</table>`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Paragraphs (lines not already wrapped)
  html = html.replace(/^(?!<[hupltoa]|$)(.+)$/gm, "<p>$1</p>");

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
