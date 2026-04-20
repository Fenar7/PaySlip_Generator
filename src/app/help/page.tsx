import Link from "next/link";
import { loadHelpIndex, searchArticles } from "@/lib/help";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function HelpCenterPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? "";
  const index = await loadHelpIndex();

  const searchResults = query ? await searchArticles(query) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
          Help Center
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Find the right answer quickly.
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--foreground-soft)]">
          Browse setup, billing, API, and troubleshooting guides from one calm,
          searchable support surface.
        </p>
      </div>

      <form method="GET" className="mb-10 rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted-foreground)]">
          <span>{index.categories.length} help categories</span>
          <span>
            {index.categories.reduce((total, category) => total + category.articles.length, 0)}{" "}
            articles
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search help articles..."
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Search
          </button>
        </div>
      </form>

      {searchResults && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </h2>
          {searchResults.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[var(--border-soft)] bg-white px-5 py-8 text-sm text-[var(--muted-foreground)] shadow-[var(--shadow-soft)]">
              No articles found. Try a broader search term or browse a category below.
            </div>
          ) : (
            <ul className="space-y-3">
              {searchResults.map((article) => (
                <li key={`${article.category}/${article.slug}`}>
                  <Link
                    href={`/help/${article.category}/${article.slug}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <span className="font-medium">{article.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {article.categoryTitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!searchResults && (
        <div className="grid gap-6 sm:grid-cols-2">
          {index.categories.map((category) => (
            <div
              key={category.slug}
              className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-lg font-semibold">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <span className="slipwise-chip px-2.5 py-1 text-[0.68rem] font-medium">
                  {category.articles.length} articles
                </span>
              </div>
              <ul className="space-y-2">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/help/${category.slug}/${article.slug}`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
        <p>
          Can&apos;t find what you&apos;re looking for?{" "}
          <a href="mailto:support@slipwise.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
