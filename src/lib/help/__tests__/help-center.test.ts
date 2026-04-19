import { describe, it, expect } from "vitest";
import {
  loadHelpIndex,
  getAllArticles,
  getArticleBySlug,
  searchArticles,
} from "@/lib/help";

describe("Help Center Service", () => {
  describe("loadHelpIndex", () => {
    it("should load the help index with all categories", async () => {
      const index = await loadHelpIndex();
      expect(index.categories).toBeDefined();
      expect(index.categories.length).toBeGreaterThanOrEqual(4);

      const slugs = index.categories.map((c) => c.slug);
      expect(slugs).toContain("onboarding");
      expect(slugs).toContain("billing");
      expect(slugs).toContain("api");
      expect(slugs).toContain("troubleshooting");
    });

    it("should have title and description for each category", async () => {
      const index = await loadHelpIndex();
      for (const category of index.categories) {
        expect(category.title).toBeTruthy();
        expect(category.description).toBeTruthy();
        expect(category.articles.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getAllArticles", () => {
    it("should return all articles across categories", async () => {
      const articles = await getAllArticles();
      expect(articles.length).toBeGreaterThanOrEqual(8);
    });

    it("should include category metadata on each article", async () => {
      const articles = await getAllArticles();
      for (const article of articles) {
        expect(article.slug).toBeTruthy();
        expect(article.title).toBeTruthy();
        expect(article.category).toBeTruthy();
        expect(article.categoryTitle).toBeTruthy();
      }
    });
  });

  describe("getArticleBySlug", () => {
    it("should load a specific article with content", async () => {
      const article = await getArticleBySlug("onboarding", "getting-started");
      expect(article).not.toBeNull();
      expect(article!.title).toBe("Getting Started with Slipwise One");
      expect(article!.content).toContain("Welcome to Slipwise One");
    });

    it("should return null for non-existent category", async () => {
      const article = await getArticleBySlug("nonexistent", "getting-started");
      expect(article).toBeNull();
    });

    it("should return null for non-existent article", async () => {
      const article = await getArticleBySlug("onboarding", "nonexistent");
      expect(article).toBeNull();
    });
  });

  describe("searchArticles", () => {
    it("should find articles by title match", async () => {
      const results = await searchArticles("Getting Started");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].slug).toBe("getting-started");
    });

    it("should find articles by content match", async () => {
      const results = await searchArticles("SAML");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty array for empty query", async () => {
      const results = await searchArticles("");
      expect(results).toEqual([]);
    });

    it("should return empty array for single character query", async () => {
      const results = await searchArticles("a");
      expect(results).toEqual([]);
    });

    it("should be case-insensitive", async () => {
      const results = await searchArticles("webhook");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should find billing-related articles for payment query", async () => {
      const results = await searchArticles("payment");
      expect(results.length).toBeGreaterThanOrEqual(1);
      const categories = results.map((r) => r.category);
      expect(categories).toContain("billing");
    });
  });
});
