/**
 * Storage abstraction layer — platform-agnostic file storage interface.
 * Supports local filesystem (dev) and AWS S3 (production).
 */

export interface StorageObject {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
  versionId?: string;
}

export interface UploadOptions {
  contentType: string;
  /** Custom metadata key-value pairs */
  metadata?: Record<string, string>;
  /** Access control: private (default) or public-read */
  acl?: "private" | "public-read";
  /** Enable server-side encryption (AES-256) */
  encryption?: boolean;
  /** Cache-Control header for CDN */
  cacheControl?: string;
}

export interface DownloadResult {
  body: Buffer;
  contentType: string;
  contentLength: number;
  etag?: string;
  versionId?: string;
}

export interface PresignedUrlOptions {
  /** URL expiry in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Response content-disposition for downloads */
  responseContentDisposition?: string;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListResult {
  objects: StorageObject[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface StorageAdapter {
  upload(key: string, body: Buffer, options: UploadOptions): Promise<StorageObject>;
  download(key: string): Promise<DownloadResult>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  getPresignedUrl(key: string, options?: PresignedUrlOptions): Promise<string>;
  getPresignedUploadUrl(key: string, options?: PresignedUrlOptions & { contentType?: string }): Promise<string>;
  list(options?: ListOptions): Promise<ListResult>;
  exists(key: string): Promise<boolean>;
  copy(sourceKey: string, destinationKey: string): Promise<StorageObject>;
  getPublicUrl(key: string): string;
}

export interface StorageConfig {
  provider: "s3" | "local";
  region: string;
  bucket: string;
  /** CloudFront distribution domain for public URLs */
  cdnDomain?: string;
  /** S3 endpoint override (for localstack/minio) */
  endpoint?: string;
  /** Force path-style access (required for localstack) */
  forcePathStyle?: boolean;
}

export function getStorageConfig(): StorageConfig {
  return {
    provider: (process.env.STORAGE_PROVIDER as "s3" | "local") || "s3",
    region: process.env.AWS_REGION || "ap-south-1",
    bucket: process.env.AWS_S3_BUCKET || "slipwise-documents",
    cdnDomain: process.env.CDN_DOMAIN || undefined,
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
  };
}
