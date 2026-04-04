import { describe, it, expect } from "vitest";
import type { PageSettings, PdfMetadata } from "@/features/docs/pdf-studio/types";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";

/**
 * Test suite for PDF metadata functionality
 * Tests the metadata configuration, parsing, and flow
 */
describe("PDF Metadata Functionality", () => {
  describe("Metadata Type Structure", () => {
    it("should have all required metadata fields", () => {
      const metadata: PdfMetadata = {
        title: "",
        author: "",
        subject: "",
        keywords: "",
      };

      expect(metadata).toHaveProperty("title");
      expect(metadata).toHaveProperty("author");
      expect(metadata).toHaveProperty("subject");
      expect(metadata).toHaveProperty("keywords");
    });

    it("should have metadata fields as strings", () => {
      const metadata: PdfMetadata = {
        title: "Test Title",
        author: "Test Author",
        subject: "Test Subject",
        keywords: "test, pdf",
      };

      expect(typeof metadata.title).toBe("string");
      expect(typeof metadata.author).toBe("string");
      expect(typeof metadata.subject).toBe("string");
      expect(typeof metadata.keywords).toBe("string");
    });
  });

  describe("Default Metadata Settings", () => {
    it("should have empty metadata in default settings", () => {
      const defaults = PDF_STUDIO_DEFAULT_SETTINGS;

      expect(defaults.metadata.title).toBe("");
      expect(defaults.metadata.author).toBe("");
      expect(defaults.metadata.subject).toBe("");
      expect(defaults.metadata.keywords).toBe("");
    });

    it("should have metadata object in PageSettings", () => {
      const settings: PageSettings = {
        ...PDF_STUDIO_DEFAULT_SETTINGS,
      };

      expect(settings.metadata).toBeDefined();
      expect(settings.metadata).toHaveProperty("title");
      expect(settings.metadata).toHaveProperty("author");
      expect(settings.metadata).toHaveProperty("subject");
      expect(settings.metadata).toHaveProperty("keywords");
    });

    it("should allow updating individual metadata fields", () => {
      let settings: PageSettings = {
        ...PDF_STUDIO_DEFAULT_SETTINGS,
      };

      // Update title
      settings = {
        ...settings,
        metadata: { ...settings.metadata, title: "New Title" },
      };
      expect(settings.metadata.title).toBe("New Title");

      // Update author
      settings = {
        ...settings,
        metadata: { ...settings.metadata, author: "New Author" },
      };
      expect(settings.metadata.author).toBe("New Author");

      // Update subject
      settings = {
        ...settings,
        metadata: { ...settings.metadata, subject: "New Subject" },
      };
      expect(settings.metadata.subject).toBe("New Subject");

      // Update keywords
      settings = {
        ...settings,
        metadata: { ...settings.metadata, keywords: "keyword1, keyword2" },
      };
      expect(settings.metadata.keywords).toBe("keyword1, keyword2");
    });
  });

  describe("Metadata Field Validation", () => {
    it("should accept any string value for title", () => {
      const testTitles = [
        "Simple Title",
        "Title with Numbers 123",
        "Title with Special!@#$%",
        "Very long title that contains many words and goes on for quite a while to test handling of lengthy strings",
      ];

      testTitles.forEach((title) => {
        const metadata: PdfMetadata = {
          title,
          author: "",
          subject: "",
          keywords: "",
        };
        expect(metadata.title).toBe(title);
      });
    });

    it("should accept any string value for author", () => {
      const testAuthors = [
        "John Doe",
        "Jane & Bob Smith",
        "Company, Inc.",
        "José García",
      ];

      testAuthors.forEach((author) => {
        const metadata: PdfMetadata = {
          title: "",
          author,
          subject: "",
          keywords: "",
        };
        expect(metadata.author).toBe(author);
      });
    });

    it("should accept any string value for subject", () => {
      const testSubjects = [
        "Quarterly Report",
        "Meeting Minutes: Q1 2024",
        "Invoice (Final)",
        "Report with 'quotes' and \"double quotes\"",
      ];

      testSubjects.forEach((subject) => {
        const metadata: PdfMetadata = {
          title: "",
          author: "",
          subject,
          keywords: "",
        };
        expect(metadata.subject).toBe(subject);
      });
    });

    it("should accept comma-separated keywords", () => {
      const testKeywords = [
        "single",
        "keyword1, keyword2",
        "tag1, tag2, tag3, tag4",
        "invoice, receipt, archive",
      ];

      testKeywords.forEach((keywords) => {
        const metadata: PdfMetadata = {
          title: "",
          author: "",
          subject: "",
          keywords,
        };
        expect(metadata.keywords).toBe(keywords);
      });
    });
  });

  describe("Keywords Parsing Logic", () => {
    it("should parse single keyword correctly", () => {
      const keywords = "singletag";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed).toEqual(["singletag"]);
    });

    it("should parse comma-separated keywords correctly", () => {
      const keywords = "keyword1, keyword2, keyword3";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed).toEqual(["keyword1", "keyword2", "keyword3"]);
    });

    it("should trim whitespace from keywords", () => {
      const keywords = "  keyword1  ,  keyword2  ,  keyword3  ";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed).toEqual(["keyword1", "keyword2", "keyword3"]);
    });

    it("should filter out empty keywords", () => {
      const keywords = "keyword1, , keyword2, , ";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed).toEqual(["keyword1", "keyword2"]);
    });

    it("should handle keywords with only commas and spaces", () => {
      const keywords = ", , , ";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed.length).toBe(0);
    });

    it("should handle empty keywords string", () => {
      const keywords = "";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed.length).toBe(0);
    });

    it("should handle keywords with newlines and tabs", () => {
      const keywords = "keyword1,\nkeyword2,\tkeyword3";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed).toEqual(["keyword1", "keyword2", "keyword3"]);
    });

    it("should preserve special characters within keywords", () => {
      const keywords = "Q1 2024, Status & Review, Client (Final)";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed).toEqual(["Q1 2024", "Status & Review", "Client (Final)"]);
    });
  });

  describe("Metadata Field Trimming", () => {
    it("should trim whitespace from title", () => {
      const title = "  Title with spaces  ";
      const trimmed = title.trim();

      expect(trimmed).toBe("Title with spaces");
    });

    it("should trim whitespace from author", () => {
      const author = "\t\tAuthor Name\t\t";
      const trimmed = author.trim();

      expect(trimmed).toBe("Author Name");
    });

    it("should trim whitespace from subject", () => {
      const subject = "\n\nSubject Text\n\n";
      const trimmed = subject.trim();

      expect(trimmed).toBe("Subject Text");
    });

    it("should not trim internal whitespace", () => {
      const title = "Title  With  Multiple  Spaces";
      const trimmed = title.trim();

      expect(trimmed).toBe("Title  With  Multiple  Spaces");
    });

    it("should handle only-whitespace fields", () => {
      const fields = ["   ", "\t\t", "\n\n", "  \t  \n  "];

      fields.forEach((field) => {
        const trimmed = field.trim();
        expect(trimmed).toBe("");
      });
    });
  });

  describe("Metadata with Special Characters", () => {
    it("should handle punctuation in metadata", () => {
      const metadata: PdfMetadata = {
        title: "Report Q&A 2024 (Final)",
        author: "Smith & Associates, Inc.",
        subject: 'Quarterly Report: 2024 Q1 - "Status Update"',
        keywords: "Q1, 2024 (Final), Status & Review",
      };

      expect(metadata.title).toBe("Report Q&A 2024 (Final)");
      expect(metadata.author).toBe("Smith & Associates, Inc.");
      expect(metadata.subject).toBe('Quarterly Report: 2024 Q1 - "Status Update"');
      expect(metadata.keywords).toBe("Q1, 2024 (Final), Status & Review");
    });

    it("should handle unicode characters", () => {
      const metadata: PdfMetadata = {
        title: "中文标题 / Chinese Title",
        author: "José García",
        subject: "Überbericht",
        keywords: "日本語, Ελληνικά, العربية",
      };

      expect(metadata.title).toContain("中文");
      expect(metadata.author).toContain("é");
      expect(metadata.subject).toContain("Ü");
      expect(metadata.keywords).toContain("日本語");
    });

    it("should handle emojis in metadata", () => {
      const metadata: PdfMetadata = {
        title: "📊 Quarterly Report 2024",
        author: "Team 🚀",
        subject: "Status Update ✅",
        keywords: "📈, 🎯, ✨",
      };

      expect(metadata.title).toContain("📊");
      expect(metadata.author).toContain("🚀");
      expect(metadata.subject).toContain("✅");
      expect(metadata.keywords).toContain("📈");
    });
  });

  describe("Metadata with Very Long Values", () => {
    it("should handle very long titles", () => {
      const longTitle =
        "This is an extremely long title that contains detailed information about the document " +
        "and includes multiple segments separated by colons. It goes on to provide context about " +
        "the content, date, and purpose of the document in a single, unbroken string.";

      const metadata: PdfMetadata = {
        title: longTitle,
        author: "",
        subject: "",
        keywords: "",
      };

      expect(metadata.title).toBe(longTitle);
      expect(metadata.title.length).toBeGreaterThan(100);
    });

    it("should handle very long author names", () => {
      const longAuthor =
        "Dr. Alexander Maximilian von Hofstadter III, PhD in Computer Science " +
        "and Business Administration from Harvard University";

      const metadata: PdfMetadata = {
        title: "",
        author: longAuthor,
        subject: "",
        keywords: "",
      };

      expect(metadata.author).toBe(longAuthor);
      expect(metadata.author.length).toBeGreaterThan(50);
    });

    it("should handle many keywords", () => {
      const manyKeywords =
        "keyword1, keyword2, keyword3, keyword4, keyword5, keyword6, " +
        "keyword7, keyword8, keyword9, keyword10, keyword11, keyword12";

      const parsed = manyKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed.length).toBe(12);
      expect(parsed[0]).toBe("keyword1");
      expect(parsed[11]).toBe("keyword12");
    });
  });

  describe("Metadata Field Empty State Handling", () => {
    it("should detect empty title", () => {
      const title = "";
      const isEmpty = !title.trim();

      expect(isEmpty).toBe(true);
    });

    it("should detect empty author", () => {
      const author = "";
      const isEmpty = !author.trim();

      expect(isEmpty).toBe(true);
    });

    it("should detect empty subject", () => {
      const subject = "";
      const isEmpty = !subject.trim();

      expect(isEmpty).toBe(true);
    });

    it("should detect whitespace-only as empty", () => {
      const fields = ["   ", "\t", "\n", "  \t  \n  "];

      fields.forEach((field) => {
        const isEmpty = !field.trim();
        expect(isEmpty).toBe(true);
      });
    });

    it("should correctly identify non-empty fields", () => {
      const fields = ["a", "Title", "  Title  ", "123", "!@#$%"];

      fields.forEach((field) => {
        const isEmpty = !field.trim();
        expect(isEmpty).toBe(false);
      });
    });

    it("should handle empty keywords correctly", () => {
      const keywords = "";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed.length).toBe(0);
    });

    it("should handle only-whitespace keywords as empty", () => {
      const keywords = ", , , ";
      const parsed = keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      expect(parsed.length).toBe(0);
    });
  });

  describe("Metadata Immutability", () => {
    it("should not modify original settings when updating metadata", () => {
      const originalSettings: PageSettings = {
        ...PDF_STUDIO_DEFAULT_SETTINGS,
      };

      const updatedSettings: PageSettings = {
        ...originalSettings,
        metadata: { ...originalSettings.metadata, title: "New Title" },
      };

      expect(originalSettings.metadata.title).toBe("");
      expect(updatedSettings.metadata.title).toBe("New Title");
    });

    it("should preserve other metadata fields when updating one", () => {
      let settings: PageSettings = {
        ...PDF_STUDIO_DEFAULT_SETTINGS,
        metadata: {
          title: "Original Title",
          author: "Original Author",
          subject: "Original Subject",
          keywords: "original, keywords",
        },
      };

      settings = {
        ...settings,
        metadata: { ...settings.metadata, title: "Updated Title" },
      };

      expect(settings.metadata.title).toBe("Updated Title");
      expect(settings.metadata.author).toBe("Original Author");
      expect(settings.metadata.subject).toBe("Original Subject");
      expect(settings.metadata.keywords).toBe("original, keywords");
    });
  });

  describe("Metadata in Full PageSettings", () => {
    it("should have metadata as part of PageSettings", () => {
      const settings: PageSettings = {
        ...PDF_STUDIO_DEFAULT_SETTINGS,
        metadata: {
          title: "Test Document",
          author: "Test Author",
          subject: "Test Subject",
          keywords: "test, pdf, metadata",
        },
      };

      expect(settings.metadata).toBeDefined();
      expect(settings.metadata.title).toBe("Test Document");
      expect(settings.metadata.author).toBe("Test Author");
      expect(settings.metadata.subject).toBe("Test Subject");
      expect(settings.metadata.keywords).toBe("test, pdf, metadata");
    });

    it("should preserve metadata when updating other page settings", () => {
      const settings: PageSettings = {
        ...PDF_STUDIO_DEFAULT_SETTINGS,
        metadata: {
          title: "Preserved Title",
          author: "Preserved Author",
          subject: "Preserved Subject",
          keywords: "preserved, keywords",
        },
      };

      const updatedSettings: PageSettings = {
        ...settings,
        size: "letter",
        compressionQuality: 50,
      };

      expect(updatedSettings.metadata.title).toBe("Preserved Title");
      expect(updatedSettings.metadata.author).toBe("Preserved Author");
      expect(updatedSettings.metadata.subject).toBe("Preserved Subject");
      expect(updatedSettings.metadata.keywords).toBe("preserved, keywords");
    });
  });

  describe("Edge Cases", () => {
    it("should handle metadata with newlines", () => {
      const metadata: PdfMetadata = {
        title: "Title\nWith\nNewlines",
        author: "Author\nName",
        subject: "Subject\nLine",
        keywords: "key\nword1, key\nword2",
      };

      expect(metadata.title).toContain("\n");
      expect(metadata.author).toContain("\n");
      expect(metadata.subject).toContain("\n");
      expect(metadata.keywords).toContain("\n");
    });

    it("should handle metadata with tabs", () => {
      const metadata: PdfMetadata = {
        title: "Title\twith\ttabs",
        author: "Author\tName",
        subject: "Subject\tLine",
        keywords: "key\tword1, key\tword2",
      };

      expect(metadata.title).toContain("\t");
      expect(metadata.author).toContain("\t");
      expect(metadata.subject).toContain("\t");
      expect(metadata.keywords).toContain("\t");
    });

    it("should handle single character metadata", () => {
      const metadata: PdfMetadata = {
        title: "A",
        author: "B",
        subject: "C",
        keywords: "D, E, F",
      };

      expect(metadata.title.length).toBe(1);
      expect(metadata.author.length).toBe(1);
      expect(metadata.subject.length).toBe(1);

      const parsed = metadata.keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      expect(parsed.length).toBe(3);
    });
  });
});
