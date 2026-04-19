import { promises as fs } from "fs";
import path from "path";

export interface HelpArticle {
  slug: string;
  title: string;
  file: string;
  content?: string;
  category: string;
  categoryTitle: string;
}

export interface HelpCategory {
  slug: string;
  title: string;
  description: string;
  articles: { slug: string; title: string; file: string }[];
}

export interface HelpIndex {
  categories: HelpCategory[];
}

const HELP_BASE = path.join(process.cwd(), "public", "docs", "help");

export async function loadHelpIndex(): Promise<HelpIndex> {
  const indexPath = path.join(HELP_BASE, "index.json");
  const raw = await fs.readFile(indexPath, "utf-8");
  return JSON.parse(raw) as HelpIndex;
}

export async function loadArticle(filePath: string): Promise<string> {
  const fullPath = path.join(HELP_BASE, filePath);
  return fs.readFile(fullPath, "utf-8");
}

export async function getAllArticles(): Promise<HelpArticle[]> {
  const index = await loadHelpIndex();
  const articles: HelpArticle[] = [];

  for (const category of index.categories) {
    for (const article of category.articles) {
      articles.push({
        slug: article.slug,
        title: article.title,
        file: article.file,
        category: category.slug,
        categoryTitle: category.title,
      });
    }
  }

  return articles;
}

export async function getArticleBySlug(
  categorySlug: string,
  articleSlug: string
): Promise<HelpArticle | null> {
  const index = await loadHelpIndex();
  const category = index.categories.find((c) => c.slug === categorySlug);
  if (!category) return null;

  const articleMeta = category.articles.find((a) => a.slug === articleSlug);
  if (!articleMeta) return null;

  const content = await loadArticle(articleMeta.file);
  return {
    slug: articleMeta.slug,
    title: articleMeta.title,
    file: articleMeta.file,
    content,
    category: category.slug,
    categoryTitle: category.title,
  };
}

export async function searchArticles(query: string): Promise<HelpArticle[]> {
  if (!query || query.trim().length < 2) return [];

  const index = await loadHelpIndex();
  const normalizedQuery = query.toLowerCase().trim();
  const results: HelpArticle[] = [];

  for (const category of index.categories) {
    for (const article of category.articles) {
      const titleMatch = article.title.toLowerCase().includes(normalizedQuery);
      let contentMatch = false;

      if (!titleMatch) {
        try {
          const content = await loadArticle(article.file);
          contentMatch = content.toLowerCase().includes(normalizedQuery);
        } catch {
          // File not found — skip
        }
      }

      if (titleMatch || contentMatch) {
        results.push({
          slug: article.slug,
          title: article.title,
          file: article.file,
          category: category.slug,
          categoryTitle: category.title,
        });
      }
    }
  }

  return results;
}
