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
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="mt-2 text-muted-foreground">
          Find answers to common questions about Slipwise One
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="mb-10">
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

      {/* Search Results */}
      {searchResults && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-muted-foreground">
              No articles found. Try a different search term.
            </p>
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

      {/* Categories Grid */}
      {!searchResults && (
        <div className="grid gap-6 sm:grid-cols-2">
          {index.categories.map((category) => (
            <div
              key={category.slug}
              className="rounded-lg border p-6 shadow-sm"
            >
              <h2 className="mb-1 text-lg font-semibold">{category.title}</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {category.description}
              </p>
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

      {/* Footer */}
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
