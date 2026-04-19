import { describe, it, expect, vi, beforeEach } from "vitest";
import { S3StorageAdapter } from "../s3-adapter";
import type { StorageConfig } from "../types";

const mockConfig: StorageConfig = {
  provider: "s3",
  region: "ap-south-1",
  bucket: "test-documents",
  cdnDomain: "cdn.test.com",
  endpoint: undefined,
  forcePathStyle: false,
};

const localConfig: StorageConfig = {
  provider: "s3",
  region: "us-east-1",
  bucket: "local-bucket",
  endpoint: "http://localhost:4566",
  forcePathStyle: true,
};

describe("S3StorageAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID", "AKIAIOSFODNN7EXAMPLE");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
  });

  describe("getPublicUrl", () => {
    it("should return CDN URL when cdnDomain is configured", () => {
      const adapter = new S3StorageAdapter(mockConfig);
      const url = adapter.getPublicUrl("documents/invoice-123.pdf");
      expect(url).toBe("https://cdn.test.com/documents/invoice-123.pdf");
    });

    it("should return S3 URL when no CDN domain", () => {
      const adapter = new S3StorageAdapter({ ...mockConfig, cdnDomain: undefined });
      const url = adapter.getPublicUrl("documents/invoice-123.pdf");
      expect(url).toBe(
        "https://test-documents.s3.ap-south-1.amazonaws.com/documents/invoice-123.pdf"
      );
    });

    it("should return path-style URL for localstack", () => {
      const adapter = new S3StorageAdapter(localConfig);
      const url = adapter.getPublicUrl("documents/test.pdf");
      expect(url).toBe("http://localhost:4566/local-bucket/documents/test.pdf");
    });
  });

  describe("upload", () => {
    it("should throw when AWS credentials are missing", async () => {
      vi.stubEnv("AWS_ACCESS_KEY_ID", "");
      vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");

      const adapter = new S3StorageAdapter(mockConfig);
      await expect(
        adapter.upload("test.pdf", Buffer.from("hello"), {
          contentType: "application/pdf",
        })
      ).rejects.toThrow("AWS credentials not configured");
    });

    it("should make a signed PUT request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ["etag", '"abc123"'],
          ["x-amz-version-id", "v1"],
        ]) as unknown as Headers,
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      const result = await adapter.upload(
        "org-1/invoices/test.pdf",
        Buffer.from("PDF content"),
        { contentType: "application/pdf", encryption: true }
      );

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("test-documents.s3.ap-south-1.amazonaws.com");
      expect(options.method).toBe("PUT");
      expect(options.headers["Authorization"]).toContain("AWS4-HMAC-SHA256");
      expect(options.headers["x-amz-server-side-encryption"]).toBe("AES256");
      expect(result.key).toBe("org-1/invoices/test.pdf");
      expect(result.bucket).toBe("test-documents");
      expect(result.size).toBe(11);

      vi.unstubAllGlobals();
    });

    it("should throw on upload failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Access Denied",
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      await expect(
        adapter.upload("test.pdf", Buffer.from("content"), {
          contentType: "text/plain",
        })
      ).rejects.toThrow("S3 upload failed [403]");

      vi.unstubAllGlobals();
    });
  });

  describe("download", () => {
    it("should throw on 404", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      await expect(adapter.download("nonexistent.pdf")).rejects.toThrow(
        "Object not found: nonexistent.pdf"
      );

      vi.unstubAllGlobals();
    });

    it("should return buffer on success", async () => {
      const content = Buffer.from("file contents");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
        headers: new Map([
          ["content-type", "application/pdf"],
          ["content-length", "13"],
          ["etag", '"etag123"'],
        ]) as unknown as Headers,
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      const result = await adapter.download("test.pdf");
      expect(result.contentType).toBe("application/pdf");
      expect(result.contentLength).toBe(13);

      vi.unstubAllGlobals();
    });
  });

  describe("delete", () => {
    it("should succeed on 204 response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      await expect(adapter.delete("test.pdf")).resolves.not.toThrow();

      vi.unstubAllGlobals();
    });
  });

  describe("exists", () => {
    it("should return true when object exists", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      const result = await adapter.exists("test.pdf");
      expect(result).toBe(true);

      vi.unstubAllGlobals();
    });

    it("should return false when object does not exist", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      const result = await adapter.exists("missing.pdf");
      expect(result).toBe(false);

      vi.unstubAllGlobals();
    });
  });

  describe("deleteMany", () => {
    it("should do nothing for empty array", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      await adapter.deleteMany([]);
      expect(mockFetch).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("getPresignedUrl", () => {
    it("should generate a valid presigned URL", async () => {
      const adapter = new S3StorageAdapter(mockConfig);
      const url = await adapter.getPresignedUrl("test.pdf", { expiresIn: 600 });

      expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
      expect(url).toContain("X-Amz-Expires=600");
      expect(url).toContain("X-Amz-Signature=");
      expect(url).toContain("test-documents.s3.ap-south-1.amazonaws.com");
    });

    it("should generate upload presigned URL", async () => {
      const adapter = new S3StorageAdapter(mockConfig);
      const url = await adapter.getPresignedUploadUrl("upload.pdf", {
        contentType: "application/pdf",
        expiresIn: 300,
      });

      expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
      expect(url).toContain("X-Amz-Expires=300");
    });
  });

  describe("list", () => {
    it("should parse list XML response", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>documents/invoice-1.pdf</Key>
    <Size>1024</Size>
    <LastModified>2024-01-15T10:30:00.000Z</LastModified>
    <ETag>"abc123"</ETag>
  </Contents>
  <Contents>
    <Key>documents/invoice-2.pdf</Key>
    <Size>2048</Size>
    <LastModified>2024-01-16T10:30:00.000Z</LastModified>
    <ETag>"def456"</ETag>
  </Contents>
</ListBucketResult>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => xmlResponse,
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new S3StorageAdapter(mockConfig);
      const result = await adapter.list({ prefix: "documents/" });

      expect(result.objects).toHaveLength(2);
      expect(result.objects[0].key).toBe("documents/invoice-1.pdf");
      expect(result.objects[0].size).toBe(1024);
      expect(result.objects[1].key).toBe("documents/invoice-2.pdf");
      expect(result.isTruncated).toBe(false);

      vi.unstubAllGlobals();
    });
  });
});
