import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, loadHelpIndex } from "@/lib/help";

interface Props {
  params: Promise<{ category: string; article: string }>;
}

export default async function HelpArticlePage({ params }: Props) {
  const { category, article: articleSlug } = await params;
  const [article, index] = await Promise.all([
    getArticleBySlug(category, articleSlug),
    loadHelpIndex(),
  ]);

  if (!article || !article.content) {
    notFound();
  }

  const categoryEntry = index.categories.find((entry) => entry.slug === category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-[240px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-5 shadow-[var(--shadow-soft)]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Browse
            </p>
            <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {article.categoryTitle}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {categoryEntry?.articles.map((entry) => {
                const href = `/help/${categoryEntry.slug}/${entry.slug}`;
                const isActive = entry.slug === article.slug;
                return (
                  <li key={entry.slug}>
                    <Link
                      href={href}
                      className={`block rounded-xl px-3 py-2 transition-colors ${
                        isActive
                          ? "bg-[var(--surface-accent)] font-medium text-[var(--accent)]"
                          : "text-[var(--foreground-soft)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {entry.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div>
          <div className="rounded-[1.75rem] border border-[var(--border-soft)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href="/help" className="hover:text-foreground">
                Help Center
              </Link>
              <span>/</span>
              <span>{article.categoryTitle}</span>
              <span>/</span>
              <span className="text-foreground">{article.title}</span>
            </nav>

            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Support article
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {article.title}
            </h1>

            <article className="prose prose-neutral mt-8 max-w-none">
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(article.content) }} />
            </article>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--foreground-soft)]">
              Need a different answer? Browse the full help center or switch categories.
            </p>
            <Link href="/help" className="slipwise-link-inline text-sm font-medium">
              Back to Help Center
            </Link>
          </div>
        </div>
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
      const thead = `<thead><tr>${headers.map((h: string) => `<th scope="col">${h}</th>`).join("")}</tr></thead>`;
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
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, href: string) => {
    const isExternal = /^https?:\/\//.test(href);
    const attrs = isExternal ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${href}"${attrs}>${text}</a>`;
  });

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
