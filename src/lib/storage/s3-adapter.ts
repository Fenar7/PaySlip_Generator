/**
 * AWS S3 Storage Adapter — Production-grade object storage implementation.
 *
 * Uses the AWS SDK v3 modular architecture for minimal bundle size.
 * Supports: upload, download, delete, presigned URLs, versioning, and CDN integration.
 */

import { createHmac, createHash } from "crypto";
import type {
  StorageAdapter,
  StorageObject,
  UploadOptions,
  DownloadResult,
  PresignedUrlOptions,
  ListOptions,
  ListResult,
  StorageConfig,
} from "./types";

/**
 * Lightweight S3 client using raw HTTP (avoids AWS SDK dependency for serverless).
 * Implements AWS Signature V4 signing for all requests.
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly region: string;
  private readonly bucket: string;
  private readonly cdnDomain?: string;
  private readonly endpoint: string;
  private readonly forcePathStyle: boolean;

  constructor(private readonly config: StorageConfig) {
    this.region = config.region;
    this.bucket = config.bucket;
    this.cdnDomain = config.cdnDomain;
    this.forcePathStyle = config.forcePathStyle ?? false;
    this.endpoint =
      config.endpoint || `https://s3.${this.region}.amazonaws.com`;
  }

  async upload(
    key: string,
    body: Buffer,
    options: UploadOptions
  ): Promise<StorageObject> {
    const headers: Record<string, string> = {
      "Content-Type": options.contentType,
      "Content-Length": body.length.toString(),
    };

    if (options.encryption !== false) {
      headers["x-amz-server-side-encryption"] = "AES256";
    }
    if (options.acl) {
      headers["x-amz-acl"] = options.acl;
    }
    if (options.cacheControl) {
      headers["Cache-Control"] = options.cacheControl;
    }
    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    const response = await this.signedRequest("PUT", key, headers, body);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `S3 upload failed [${response.status}]: ${text.slice(0, 200)}`
      );
    }

    return {
      key,
      bucket: this.bucket,
      size: body.length,
      contentType: options.contentType,
      lastModified: new Date(),
      etag: response.headers.get("etag") ?? undefined,
      versionId: response.headers.get("x-amz-version-id") ?? undefined,
    };
  }

  async download(key: string): Promise<DownloadResult> {
    const response = await this.signedRequest("GET", key, {});

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Object not found: ${key}`);
      }
      const text = await response.text();
      throw new Error(
        `S3 download failed [${response.status}]: ${text.slice(0, 200)}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      body: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type") || "application/octet-stream",
      contentLength: parseInt(response.headers.get("content-length") || "0", 10),
      etag: response.headers.get("etag") ?? undefined,
      versionId: response.headers.get("x-amz-version-id") ?? undefined,
    };
  }

  async delete(key: string): Promise<void> {
    const response = await this.signedRequest("DELETE", key, {});

    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      throw new Error(
        `S3 delete failed [${response.status}]: ${text.slice(0, 200)}`
      );
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    // S3 Delete Objects (batch) — max 1000 per request
    const batches = [];
    for (let i = 0; i < keys.length; i += 1000) {
      batches.push(keys.slice(i, i + 1000));
    }

    for (const batch of batches) {
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Delete>
  <Quiet>true</Quiet>
  ${batch.map((k) => `<Object><Key>${escapeXml(k)}</Key></Object>`).join("\n  ")}
</Delete>`;

      const bodyBuffer = Buffer.from(xmlBody, "utf-8");
      const md5 = createHash("md5").update(bodyBuffer).digest("base64");

      const response = await this.signedRequest(
        "POST",
        "?delete",
        {
          "Content-Type": "application/xml",
          "Content-MD5": md5,
          "Content-Length": bodyBuffer.length.toString(),
        },
        bodyBuffer
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `S3 deleteMany failed [${response.status}]: ${text.slice(0, 200)}`
        );
      }
    }
  }

  async getPresignedUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    const expiresIn = options?.expiresIn ?? 3600;
    return this.generatePresignedUrl("GET", key, expiresIn, {
      ...(options?.responseContentDisposition && {
        "response-content-disposition": options.responseContentDisposition,
      }),
    });
  }

  async getPresignedUploadUrl(
    key: string,
    options?: PresignedUrlOptions & { contentType?: string }
  ): Promise<string> {
    const expiresIn = options?.expiresIn ?? 3600;
    return this.generatePresignedUrl("PUT", key, expiresIn, {
      ...(options?.contentType && { "Content-Type": options.contentType }),
    });
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams({ "list-type": "2" });
    if (options?.prefix) params.set("prefix", options.prefix);
    if (options?.maxKeys) params.set("max-keys", options.maxKeys.toString());
    if (options?.continuationToken)
      params.set("continuation-token", options.continuationToken);

    const response = await this.signedRequest(
      "GET",
      `?${params.toString()}`,
      {}
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `S3 list failed [${response.status}]: ${text.slice(0, 200)}`
      );
    }

    const xml = await response.text();
    return parseListResponse(xml, this.bucket);
  }

  async exists(key: string): Promise<boolean> {
    const response = await this.signedRequest("HEAD", key, {});
    return response.ok;
  }

  async copy(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    const headers: Record<string, string> = {
      "x-amz-copy-source": `/${this.bucket}/${sourceKey}`,
      "x-amz-server-side-encryption": "AES256",
    };

    const response = await this.signedRequest("PUT", destinationKey, headers);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `S3 copy failed [${response.status}]: ${text.slice(0, 200)}`
      );
    }

    return {
      key: destinationKey,
      bucket: this.bucket,
      size: 0, // Copy result doesn't return size directly
      contentType: "application/octet-stream",
      lastModified: new Date(),
      versionId: response.headers.get("x-amz-version-id") ?? undefined,
    };
  }

  getPublicUrl(key: string): string {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }
    if (this.forcePathStyle) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ─── AWS Signature V4 ───────────────────────────────────────────

  private async signedRequest(
    method: string,
    keyOrQuery: string,
    headers: Record<string, string>,
    body?: Buffer
  ): Promise<Response> {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKey || !secretKey) {
      throw new Error("AWS credentials not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)");
    }

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const isQuery = keyOrQuery.startsWith("?");
    const path = isQuery
      ? this.forcePathStyle ? `/${this.bucket}/` : "/"
      : this.forcePathStyle
        ? `/${this.bucket}/${keyOrQuery}`
        : `/${keyOrQuery}`;

    const queryString = isQuery ? keyOrQuery.slice(1) : "";

    const host = this.forcePathStyle
      ? new URL(this.endpoint).host
      : `${this.bucket}.s3.${this.region}.amazonaws.com`;

    const payloadHash = body
      ? createHash("sha256").update(body).digest("hex")
      : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // empty body hash

    const signedHeaders: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...headers,
    };

    const sortedHeaderKeys = Object.keys(signedHeaders)
      .map((k) => k.toLowerCase())
      .sort();
    const canonicalHeaders = sortedHeaderKeys
      .map((k) => `${k}:${signedHeaders[Object.keys(signedHeaders).find((h) => h.toLowerCase() === k)!]?.trim()}`)
      .join("\n") + "\n";
    const signedHeadersStr = sortedHeaderKeys.join(";");

    const canonicalRequest = [
      method,
      encodeURI(path),
      queryString,
      canonicalHeaders,
      signedHeadersStr,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = getSignatureKey(secretKey, dateStamp, this.region, "s3");
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    const url = this.forcePathStyle
      ? `${this.endpoint}${path}${queryString ? "?" + queryString : ""}`
      : `https://${host}${path}${queryString ? "?" + queryString : ""}`;

    const fetchHeaders: Record<string, string> = {
      ...signedHeaders,
      Authorization: authorization,
    };
    delete fetchHeaders["host"];

    return fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? new Uint8Array(body) : undefined,
    });
  }

  private generatePresignedUrl(
    method: string,
    key: string,
    expiresIn: number,
    additionalParams: Record<string, string>
  ): string {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKey || !secretKey) {
      throw new Error("AWS credentials not configured");
    }

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const host = this.forcePathStyle
      ? new URL(this.endpoint).host
      : `${this.bucket}.s3.${this.region}.amazonaws.com`;

    const path = this.forcePathStyle ? `/${this.bucket}/${key}` : `/${key}`;
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${accessKey}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expiresIn.toString(),
      "X-Amz-SignedHeaders": "host",
      ...additionalParams,
    });
    queryParams.sort();

    const canonicalRequest = [
      method,
      encodeURI(path),
      queryParams.toString(),
      `host:${host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = getSignatureKey(secretKey, dateStamp, this.region, "s3");
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    queryParams.set("X-Amz-Signature", signature);

    const baseUrl = this.forcePathStyle
      ? `${this.endpoint}${path}`
      : `https://${host}${path}`;

    return `${baseUrl}?${queryParams.toString()}`;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseListResponse(xml: string, bucket: string): ListResult {
  const objects: StorageObject[] = [];
  const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");

  const tokenMatch = xml.match(
    /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/
  );
  const nextContinuationToken = tokenMatch?.[1];

  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentRegex.exec(xml)) !== null) {
    const content = match[1];
    const key = content.match(/<Key>([^<]+)<\/Key>/)?.[1] ?? "";
    const size = parseInt(
      content.match(/<Size>([^<]+)<\/Size>/)?.[1] ?? "0",
      10
    );
    const lastModified = new Date(
      content.match(/<LastModified>([^<]+)<\/LastModified>/)?.[1] ?? ""
    );
    const etag = content.match(/<ETag>([^<]+)<\/ETag>/)?.[1];

    objects.push({
      key,
      bucket,
      size,
      contentType: "application/octet-stream",
      lastModified,
      etag,
    });
  }

  return { objects, isTruncated, nextContinuationToken };
}
